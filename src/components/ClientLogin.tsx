import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserCircle, Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';

interface ClientLoginProps {
  onLogin: (user: any) => void;
}

export function ClientLogin({ onLogin }: ClientLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data: globalLoginSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'global_login_enabled')
        .maybeSingle();

      if (globalLoginSetting?.value === 'false') {
        setError('Login is not available right now. Please contact administrator.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', password)
        .eq('role', 'client')
        .maybeSingle();

      if (error || !data) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (data.is_blocked === true) {
        setError(data.block_reason || 'Please Pay your dues to login. Contact Administrator');
        setIsLoading(false);
        return;
      }

      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role
      };

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

      const deviceInfo = getDeviceInfo();
      const ipAddress = await getIPAddress();
      const now = new Date().toISOString();

      const { data: sessionData } = await supabase
        .from('user_sessions')
        .insert({
          user_id: data.id,
          user_name: data.name,
          user_role: data.role,
          device_info: deviceInfo,
          ip_address: ipAddress,
          login_time: now,
          last_activity: now,
          is_active: true
        })
        .select()
        .single();

      if (sessionData) {
        localStorage.setItem('client_session_id', sessionData.id);
      }

      onLogin(userData);
    } catch (err) {
      setError('Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzEwYjk4MSIgc3Ryb2tlLXdpZHRoPSIuNSIgb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
      </div>

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-shimmer"></div>

      {showWelcome && (
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950 z-50 flex items-center justify-center backdrop-blur-xl animate-fade-out">
          <div className="text-center">
            <div className="relative mb-8 animate-float">
              <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-40 animate-pulse-slow"></div>
              <UserCircle className="relative w-32 h-32 text-emerald-400 animate-glow-pulse" strokeWidth={1.5} />
            </div>
            <h1 className="text-6xl font-black text-white mb-4 animate-slide-up tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent animate-gradient">
                CLIENT PORTAL
              </span>
            </h1>
            <div className="flex items-center justify-center gap-2 animate-slide-up-delay">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-twinkle" />
              <p className="text-emerald-300 text-xl font-semibold">
                Junaid Meetings Dashboard
              </p>
              <Sparkles className="w-5 h-5 text-emerald-400 animate-twinkle-delay" />
            </div>
          </div>
        </div>
      )}

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/50 mb-6 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
              <UserCircle className="relative w-10 h-10 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 bg-clip-text text-transparent">
                JUNAID MEETINGS
              </span>
            </h1>
            <p className="text-emerald-300 text-sm font-semibold uppercase tracking-wider">
              Client Access
            </p>
          </div>

          <div className="relative group animate-fade-in-up-delay">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl blur-lg opacity-60 group-hover:opacity-80 transition duration-1000 animate-gradient-xy"></div>
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">
                  Sign In
                </h2>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">SECURE</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border-2 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-800 outline-none transition-all duration-300 group-hover:border-slate-600"
                      placeholder="client@email.com"
                      required
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Lock className="w-4 h-4" />
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 border-2 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-slate-800 outline-none transition-all duration-300 group-hover:border-slate-600"
                      placeholder="••••••••••••"
                      required
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-shake">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 animate-pulse"></div>
                    <p className="text-sm text-red-400 font-medium flex-1">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl transition-all duration-300 group-hover:scale-105"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-300"></div>
                  <div className="relative px-6 py-4 flex items-center justify-center gap-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-white font-bold text-base">Signing In...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5 text-white" />
                        <span className="text-white font-bold text-base">Sign In</span>
                        <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <UserCircle className="w-3 h-3" />
                  <span>Protected by enterprise-grade security</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500 animate-fade-in">
            <p>Junaid Meetings Management System v2.0</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-out {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.5)); }
          50% { filter: drop-shadow(0 0 40px rgba(16, 185, 129, 0.8)); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-up-delay {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fade-in-up-delay {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes gradient-xy {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        @keyframes twinkle-delay {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.6; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fade-out {
          animation: fade-out 2.5s ease-in-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.2s both;
        }

        .animate-slide-up-delay {
          animation: slide-up-delay 0.8s ease-out 0.5s both;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out 0.3s both;
        }

        .animate-fade-in-up-delay {
          animation: fade-in-up-delay 0.6s ease-out 0.5s both;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        .animate-twinkle-delay {
          animation: twinkle-delay 2s ease-in-out 0.5s infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out 1s both;
        }
      `}</style>
    </div>
  );
}
