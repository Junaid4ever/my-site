import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, X, Users, DollarSign, Image as ImageIcon, Edit, Check, Key, Monitor, Circle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  price_per_member?: number;
  created_at: string;
}

interface UserManagementProps {
  onClose: () => void;
}

interface Payment {
  id: string;
  client_id: string;
  payment_date: string;
  amount: number;
  screenshot_url: string;
  created_at: string;
}

interface UserSession {
  id: string;
  user_id: string;
  device_info: string;
  ip_address: string;
  login_time: string;
  last_activity: string;
  is_active: boolean;
}

export function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'client'>('client');
  const [pricePerMember, setPricePerMember] = useState<number>(0);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [loginRestricted, setLoginRestricted] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDpPrice, setEditDpPrice] = useState<number>(240);
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    if (data) {
      setUsers(data);
    }
  };

  const fetchPayments = async (userId?: string) => {
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('client_id', userId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPayments(data);
    }
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('last_activity', { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
  };

  const fetchSettings = async () => {
    const [regData, loginData] = await Promise.all([
      supabase.from('settings').select('value').eq('key', 'registration_enabled').maybeSingle(),
      supabase.from('system_settings').select('setting_value').eq('setting_key', 'login_restricted').maybeSingle()
    ]);

    if (regData.data) {
      setRegistrationEnabled(regData.data.value === 'true');
    }
    if (loginData.data) {
      setLoginRestricted(loginData.data.setting_value === 'true');
    }
  };

  const toggleRegistration = async () => {
    const newValue = !registrationEnabled;

    const { error } = await supabase
      .from('settings')
      .update({ value: newValue.toString(), updated_at: new Date().toISOString() })
      .eq('key', 'registration_enabled');

    if (error) {
      alert('Error updating registration setting: ' + error.message);
      return;
    }

    setRegistrationEnabled(newValue);
  };

  const toggleLoginRestriction = async () => {
    const newValue = !loginRestricted;

    const { error } = await supabase
      .from('system_settings')
      .update({ setting_value: newValue.toString(), updated_at: new Date().toISOString() })
      .eq('setting_key', 'login_restricted');

    if (error) {
      alert('Error updating login restriction: ' + error.message);
      return;
    }

    setLoginRestricted(newValue);
  };

  const updateUserRate = async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({
        price_per_member: editPrice,
        price_per_dp_member: editDpPrice
      })
      .eq('id', userId);

    if (error) {
      alert('Error updating rate: ' + error.message);
      return;
    }

    alert('Rate updated successfully!');
    setEditingUserId(null);
    fetchUsers();
  };

  const changePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        password_hash: newPassword
      })
      .eq('id', userId);

    if (error) {
      alert('Error changing password: ' + error.message);
      return;
    }

    alert('Password changed successfully!');
    setChangingPasswordUserId(null);
    setNewPassword('');
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
    fetchPayments();
    fetchSessions();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'client' && !registrationEnabled) {
      alert('Client registration is currently disabled. Please enable it first.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .insert([
        {
          email,
          name,
          password_hash: password,
          role,
          price_per_member: role === 'client' ? pricePerMember : 0
        }
      ]);

    if (error) {
      alert('Error adding user: ' + error.message);
      return;
    }

    setEmail('');
    setName('');
    setPassword('');
    setRole('client');
    setPricePerMember(0);
    setShowForm(false);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to delete ${user.name}?\n\nThis will permanently delete:\n- All their meetings\n- All payment records\n- All dues and adjustments\n- All historical data\n\nThis action CANNOT be undone!`)) {
      return;
    }

    try {
      const userName = user.name;

      console.log(`Starting deletion for ${userName} (${userId})...`);

      const deletions = await Promise.allSettled([
        supabase.from('meetings').delete().eq('client_id', userId),
        supabase.from('meetings').delete().eq('client_name', userName),
        supabase.from('historical_meetings').delete().eq('client_id', userId),
        supabase.from('historical_meetings').delete().eq('client_name', userName),
        supabase.from('payments').delete().eq('client_id', userId),
        supabase.from('payments').delete().eq('client_name', userName),
        supabase.from('daily_dues').delete().eq('client_id', userId),
        supabase.from('daily_dues').delete().eq('client_name', userName),
        supabase.from('due_adjustments').delete().eq('client_id', userId),
        supabase.from('due_adjustments').delete().eq('client_name', userName),
        supabase.from('advance_payments').delete().eq('client_id', userId),
        supabase.from('advance_payments').delete().eq('client_name', userName),
        supabase.from('invoices').delete().eq('client_id', userId),
        supabase.from('invoices').delete().eq('client_name', userName),
        supabase.from('notifications').delete().eq('client_id', userId),
        supabase.from('payment_receiving').delete().eq('client_id', userId),
        supabase.from('payment_receiving').delete().eq('client_name', userName),
        supabase.from('license_management').delete().eq('client_name', userName),
        supabase.from('manual_income_entries').delete().eq('client_name', userName),
        supabase.from('estimated_earnings').delete().eq('client_name', userName),
        supabase.from('meeting_screenshots').delete().eq('client_name', userName)
      ]);

      const failedDeletions = deletions.filter(r => r.status === 'rejected');
      if (failedDeletions.length > 0) {
        console.error('Some deletions failed:', failedDeletions);
      }

      console.log(`Deleted all related records for ${userName}`);

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        console.error('Error deleting user:', userError);
        alert('Error deleting user: ' + userError.message);
        return;
      }

      console.log(`Successfully deleted user ${userName}`);

      setUsers(prev => prev.filter(u => u.id !== userId));
      alert(`${userName} and all their data has been permanently deleted!`);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      console.error('Deletion error:', err);
      alert('Error during deletion: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-white" />
            <h2 className="text-2xl font-black text-white">User Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 p-2 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg"
            >
              <UserPlus size={18} />
              Add New User
            </button>

            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Registration:</span>
                <button onClick={toggleRegistration} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${registrationEnabled ? 'bg-green-600' : 'bg-gray-400'}`}>
                  <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-lg transition-transform ${registrationEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm font-bold ${registrationEnabled ? 'text-green-600' : 'text-gray-500'}`}>{registrationEnabled ? 'ON' : 'OFF'}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">Client Login:</span>
                <button onClick={toggleLoginRestriction} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${!loginRestricted ? 'bg-green-600' : 'bg-red-600'}`}>
                  <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-lg transition-transform ${!loginRestricted ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm font-bold ${!loginRestricted ? 'text-green-600' : 'text-red-600'}`}>{!loginRestricted ? 'ON' : 'OFF'}</span>
              </div>

              <button onClick={() => setShowSessions(!showSessions)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2">
                <Monitor size={16} /> {showSessions ? 'Hide' : 'Show'} Sessions
              </button>
            </div>
          </div>

          {showSessions && (
            <div className="bg-white rounded-2xl p-6 mb-6 border-2 border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Monitor size={20} /> Active Sessions</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessions.map(session => {
                  const user = users.find(u => u.id === session.user_id);
                  const lastActivity = new Date(session.last_activity);
                  const isOnline = (Date.now() - lastActivity.getTime()) < 300000;
                  return (
                    <div key={session.id} className={`p-4 rounded-xl border-2 ${isOnline ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Circle size={10} className={`${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
                            <span className="font-bold text-gray-900">{user?.name || 'Unknown'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isOnline ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                          </div>
                          <p className="text-sm text-gray-600">{user?.email}</p>
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p><strong>Device:</strong> {session.device_info}</p>
                            <p><strong>IP:</strong> {session.ip_address}</p>
                            <p><strong>Login:</strong> {new Date(session.login_time).toLocaleString()}</p>
                            <p><strong>Last Active:</strong> {lastActivity.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {sessions.length === 0 && <p className="text-center text-gray-500 py-8">No active sessions</p>}
              </div>
            </div>
          )}

          {showForm && (
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 mb-6 border-2 border-slate-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create New User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                    placeholder="Enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Role *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="client"
                        checked={role === 'client'}
                        onChange={() => setRole('client')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Client</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Admin</span>
                    </label>
                  </div>
                </div>

                {role === 'client' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price Per Member (Max 5) *
                    </label>
                    <input
                      type="number"
                      value={pricePerMember}
                      onChange={(e) => setPricePerMember(Math.min(5, Math.max(0, Number(e.target.value))))}
                      min="0"
                      max="5"
                      step="0.01"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEmail('');
                      setName('');
                      setPassword('');
                      setRole('client');
                      setPricePerMember(0);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2.5 px-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl transition-all"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-gray-900">{user.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          user.role === 'admin'
                            ? 'bg-red-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>

                    {user.role === 'client' && (
                      <>
                        {editingUserId === user.id ? (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="text-xs font-semibold text-gray-700">Regular Rate (₹/member)</label>
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                step="0.1"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-700">DP/Foreigner Rate (₹/member)</label>
                              <input
                                type="number"
                                value={editDpPrice}
                                onChange={(e) => setEditDpPrice(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                step="0.1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateUserRate(user.id)}
                                className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-1"
                              >
                                <Check size={14} /> Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="flex-1 bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {user.price_per_member !== undefined && (
                              <p className="text-sm font-semibold text-green-600 mt-1">
                                Rate: ₹{user.price_per_member} per member
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </p>

                    {changingPasswordUserId === user.id && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-700">New Password</label>
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Enter new password"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => changePassword(user.id)}
                            className="flex-1 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center justify-center gap-1"
                          >
                            <Check size={14} /> Change Password
                          </button>
                          <button
                            onClick={() => {
                              setChangingPasswordUserId(null);
                              setNewPassword('');
                            }}
                            className="flex-1 bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {user.role === 'client' && editingUserId !== user.id && (
                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditPrice(user.price_per_member || 0);
                          setEditDpPrice((user as any).price_per_dp_member || 240);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit rates"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setChangingPasswordUserId(user.id);
                        setNewPassword('');
                      }}
                      className="p-2 text-purple-500 hover:bg-purple-50 rounded-xl transition-all"
                      title="Change password"
                    >
                      <Key size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete user"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No users found. Add your first user above.
              </div>
            )}
          </div>

          {payments.length > 0 && (
            <div className="mt-6 border-t border-gray-300 pt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-red-600" />
                Payment History
              </h3>
              <div className="space-y-3">
                {payments.map((payment) => {
                  const user = users.find(u => u.id === payment.client_id);
                  return (
                    <div
                      key={payment.id}
                      className="bg-red-50 border border-red-200 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{user?.name || 'Unknown User'}</p>
                          <p className="text-sm text-gray-600">{user?.email}</p>
                          <p className="text-sm font-bold text-red-600 mt-1">
                            <span className="font-semibold">Amount:</span> ${payment.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Date: {new Date(payment.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={payment.screenshot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                            title="View screenshot"
                          >
                            <ImageIcon size={18} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
