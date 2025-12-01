import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  loadingProgress: number;
  logoutMessage: string | null;
}

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('Firefox/')) browser = `Firefox ${ua.split('Firefox/')[1].split(' ')[0]}`;
  else if (ua.includes('Chrome/') && !ua.includes('Edg')) browser = `Chrome ${ua.split('Chrome/')[1].split(' ')[0]}`;
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = `Safari ${ua.split('Version/')[1]?.split(' ')[0] || 'Unknown'}`;
  else if (ua.includes('Edg/')) browser = `Edge ${ua.split('Edg/')[1].split(' ')[0]}`;

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';

  return `${browser} (${os})`;
};

const getIPAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'Unknown';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);

    const savedUser = localStorage.getItem('user');
    const savedSessionId = localStorage.getItem('session_id');

    if (savedUser && savedSessionId) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.id && parsedUser.email) {
          setUser(parsedUser);
          setSessionId(savedSessionId);
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('session_id');
        }
      } catch (e) {
        console.error('Invalid user data in localStorage');
        localStorage.removeItem('user');
        localStorage.removeItem('session_id');
      }
    }

    setLoadingProgress(100);
    setTimeout(() => {
      setLoading(false);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !sessionId) return;

    const checkLoginStatus = async () => {
      if (user.role === 'client') {
        const { data: globalLoginSetting } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'global_login_enabled')
          .maybeSingle();

        if (globalLoginSetting?.value === 'false') {
          setLogoutMessage('Login disabled. Contact administrator.');
          logout();
          return false;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('is_blocked, block_reason')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.is_blocked === true) {
          setLogoutMessage(userData.block_reason || 'Please Pay your dues to login. Contact Administrator');
          logout();
          return false;
        }
      }
      return true;
    };

    const updateActivity = async () => {
      const canContinue = await checkLoginStatus();

      if (canContinue) {
        await supabase
          .from('user_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('is_active', true);
      }
    };

    updateActivity();
    const activityInterval = setInterval(updateActivity, 3000);

    const channel = supabase
      .channel('settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'settings',
          filter: 'key=eq.global_login_enabled'
        },
        (payload: any) => {
          if (payload.new.value === 'false' && user.role === 'client') {
            setLogoutMessage('Login disabled. Contact administrator.');
            logout();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload.new.is_blocked === true && user.role === 'client') {
            setLogoutMessage(payload.new.block_reason || 'Please Pay your dues to login. Contact Administrator');
            logout();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(activityInterval);
      channel.unsubscribe();
    };
  }, [user, sessionId]);

  const login = async (email: string, password: string) => {
    try {
      const [settingsResult, userResult] = await Promise.all([
        supabase.from('system_settings').select('setting_value').eq('setting_key', 'login_restricted').maybeSingle(),
        supabase.from('users').select('*').eq('email', email).maybeSingle()
      ]);

      const { data: settingsData } = settingsResult;
      const { data: tempUser, error: userError } = userResult;

      if (userError) {
        console.error('Login error:', userError);
        throw new Error('Invalid credentials');
      }

      if (!tempUser) {
        throw new Error('Invalid credentials');
      }

      if (settingsData?.setting_value === 'true' && tempUser.role !== 'admin') {
        throw new Error('LOGIN_DISABLED');
      }

      if (tempUser.password_hash !== password) {
        throw new Error('Invalid credentials');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        throw new Error('Invalid credentials');
      }

      if (!data) {
        throw new Error('Invalid credentials');
      }

      const userData: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role
      };

      const deviceInfo = getDeviceInfo();
      const ipAddress = await getIPAddress();
      const now = new Date().toISOString();

      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userData.id,
          user_name: userData.name,
          user_role: userData.role,
          login_time: now,
          last_activity: now,
          device_info: deviceInfo,
          ip_address: ipAddress,
          is_active: true
        })
        .select()
        .single();

      if (sessionError) {
        console.error('❌ Session creation error:', sessionError);
        alert('Session tracking failed: ' + sessionError.message);
      } else if (sessionData) {
        console.log('✅ Session created:', sessionData.id);
        setSessionId(sessionData.id);
        localStorage.setItem('session_id', sessionData.id);
      } else {
        console.error('❌ No session data returned');
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    if (sessionId) {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          logout_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      localStorage.removeItem('session_id');
      setSessionId(null);
    }

    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, loadingProgress, logoutMessage }}>
      {logoutMessage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in">
          <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-3xl p-8 max-w-md mx-4 shadow-2xl border-2 border-red-400 animate-scale-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-white mb-4">Access Denied</h2>
              <p className="text-white/90 text-lg font-semibold mb-6">{logoutMessage}</p>
              <button
                onClick={() => {
                  setLogoutMessage(null);
                  window.location.reload();
                }}
                className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-red-50 transition-all shadow-lg hover:scale-105"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
