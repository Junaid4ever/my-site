import { useState, useEffect } from 'react';
import { supabase, startConnectionMonitor, stopConnectionMonitor, testConnection } from './lib/supabase';
import { AdminPanel } from './components/AdminPanel';
import { ClientPanel } from './components/ClientPanel';
import { LogIn, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPricePerMember, setSignupPricePerMember] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      const impersonateId = localStorage.getItem('impersonate_client_id');
      const impersonateName = localStorage.getItem('impersonate_client_name');

      if (impersonateId && impersonateName) {
        try {
          const { data } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', impersonateId)
            .maybeSingle();

          if (data) {
            const userData = { id: data.id, email: data.email, name: data.name, role: data.role };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (err) {
          console.error('Impersonate error:', err);
        }

        localStorage.removeItem('impersonate_client_id');
        localStorage.removeItem('impersonate_client_name');
      }

      setLoading(false);
    };

    initApp();

    return () => {
      stopConnectionMonitor();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('name', loginName)
        .eq('password_hash', loginPassword)
        .maybeSingle();

      if (error || !data) {
        alert('Invalid credentials');
        return;
      }

      const userData = { id: data.id, email: data.email, name: data.name, role: data.role };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setLoginName('');
      setLoginPassword('');
    } catch (err) {
      alert('Login failed. Please try again.');
      console.error('Login error:', err);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: settingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle();

    if (settingData?.value !== 'true') {
      alert('Registration is currently disabled. Please contact the administrator.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .insert([
        {
          email: `${signupName.toLowerCase().replace(/\s+/g, '')}@client.junaid.com`,
          name: signupName,
          password_hash: signupPassword,
          role: 'client',
          price_per_member: signupPricePerMember
        }
      ]);

    if (error) {
      alert('Error creating account: ' + error.message);
      return;
    }

    alert('Account created successfully! You can now login.');
    setShowSignup(false);
    setSignupPassword('');
    setSignupName('');
    setSignupPricePerMember(0);
  };

  const handleLogout = async () => {
    const sessionId = localStorage.getItem('client_session_id');
    if (sessionId) {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      localStorage.removeItem('client_session_id');
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#374151"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - loadingProgress / 100)}`}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-white">{loadingProgress}%</span>
            </div>
          </div>
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <AdminPanel onLogout={handleLogout} />;
  }

  if (user?.role === 'client') {
    return <ClientPanel user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-100 flex items-center justify-center p-4">
      {connectionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <p className="font-bold">Database Connection Issue</p>
            <p className="text-xs">{connectionError}</p>
          </div>
          <button
            onClick={async () => {
              const test = await testConnection();
              if (test.success) {
                setConnectionError(null);
                window.location.reload();
              } else {
                alert('Still cannot connect. Please check your internet connection.');
              }
            }}
            className="ml-4 bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}


      <div className="w-full max-w-md">
        <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 rounded-3xl shadow-2xl p-8 mb-6 border border-gray-700/50">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="bg-white/95 p-3 rounded-2xl shadow-2xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="5" fill="#1e293b"/>
                <path d="M6 8C6 7.44772 6.44772 7 7 7H11C11.5523 7 12 7.44772 12 8V16C12 16.5523 11.5523 17 11 17H7C6.44772 17 6 16.5523 6 16V8Z" fill="white"/>
                <path d="M13 9.5V14.5L18 17V7L13 9.5Z" fill="white"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white text-center tracking-tight mb-1">
            Junaid Meetings
          </h1>
          <p className="text-gray-300 text-center text-sm font-light">
            {showSignup ? 'Create Your Account' : 'Elegant meeting management'}
          </p>
        </div>

        {!showSignup ? (
          <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-2xl p-8 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Admin Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <LogIn size={18} />
                Login
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowSignup(true)}
                className="text-slate-600 hover:text-slate-800 text-sm font-semibold transition-colors"
              >
                New client? Create account →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl shadow-2xl p-8 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Create Client Account
            </h2>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300"
                  placeholder="Enter client name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300"
                  placeholder="Create a password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price Per Member (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={signupPricePerMember}
                  onChange={(e) => setSignupPricePerMember(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300"
                  placeholder="0.00"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <UserPlus size={18} />
                Create Account
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowSignup(false)}
                className="text-slate-600 hover:text-slate-800 text-sm font-semibold transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-out {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }

        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 215, 0, 0.5); }
          50% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 215, 0, 0.8); }
        }

        .animate-fade-out {
          animation: fade-out 3s ease-in-out forwards;
        }

        .animate-bounce-in {
          animation: bounce-in 1s ease-out;
        }

        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
