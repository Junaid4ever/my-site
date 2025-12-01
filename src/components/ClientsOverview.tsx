import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, IndianRupee, Calendar, TrendingUp, Bell, UserCog, Key, Trash2, LogIn, Eye, DollarSign, CheckCircle, XCircle, TrendingDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const formatIndianNumber = (num: number | string): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';

  const [integer, decimal] = n.toFixed(2).split('.');
  const lastThree = integer.slice(-3);
  const otherNumbers = integer.slice(0, -3);
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (otherNumbers ? ',' : '') + lastThree;

  return decimal && parseFloat(decimal) > 0 ? `${formatted}.${decimal}` : formatted;
};

interface ClientSummary {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  totalDues: number;
  totalPaidAmount: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  unpaidDays: number;
  pricePerMember: number;
  pricePerForeignMember: number;
  pricePerDpMember: number;
  advanceAmount: number;
  hasAdvance: boolean;
  isBlocked: boolean;
  blockReason: string;
}

export function ClientsOverview() {
  const { isDark } = useTheme();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionProof, setDeductionProof] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [globalLoginEnabled, setGlobalLoginEnabled] = useState(true);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    fetchClientsData();
    fetchSettings();

    const subscription = supabase
      .channel('clients_overview_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_dues'
      }, () => {
        fetchClientsData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        fetchClientsData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['global_login_enabled', 'registration_enabled']);

    data?.forEach(setting => {
      if (setting.key === 'global_login_enabled') {
        setGlobalLoginEnabled(setting.value === 'true');
      } else if (setting.key === 'registration_enabled') {
        setRegistrationEnabled(setting.value === 'true');
      }
    });
  };

  const toggleGlobalLogin = async () => {
    const newValue = !globalLoginEnabled;
    await supabase
      .from('settings')
      .update({ value: String(newValue), updated_at: new Date().toISOString() })
      .eq('key', 'global_login_enabled');

    setGlobalLoginEnabled(newValue);

    if (!newValue) {
      alert('Global login disabled! All clients will be logged out automatically.');
    } else {
      alert('Global login enabled! Clients can now login.');
    }
  };

  const toggleRegistration = async () => {
    const newValue = !registrationEnabled;
    await supabase
      .from('settings')
      .update({ value: String(newValue), updated_at: new Date().toISOString() })
      .eq('key', 'registration_enabled');

    setRegistrationEnabled(newValue);
    alert(newValue ? 'Registration enabled!' : 'Registration disabled!');
  };

  const toggleClientBlock = async (clientId: string, currentlyBlocked: boolean) => {
    const newBlockedState = !currentlyBlocked;

    const { error } = await supabase
      .from('users')
      .update({
        is_blocked: newBlockedState,
        login_enabled: !newBlockedState
      })
      .eq('id', clientId);

    if (error) {
      alert('Error updating client block status: ' + error.message);
      return;
    }

    await fetchClientsData();
    alert(newBlockedState ? 'Client blocked successfully!' : 'Client unblocked successfully!');
  };

  const fetchClientsData = async () => {
    setLoading(true);

    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, email, password_hash, price_per_member, price_per_foreign_member, price_per_dp_member, is_blocked, block_reason')
      .eq('role', 'client')
      .order('name');

    if (!usersData) {
      setLoading(false);
      return;
    }

    const clientIds = usersData.map(u => u.id);
    const clientNames = usersData.map(u => u.name);

    const [duesResult, paymentsResult, advancesResult] = await Promise.all([
      supabase
        .from('daily_dues')
        .select('client_name, amount, date')
        .in('client_name', clientNames),

      supabase
        .from('payments')
        .select('client_id, amount, payment_upto_date, rejected_amount')
        .in('client_id', clientIds)
        .eq('status', 'approved')
        .order('payment_upto_date', { ascending: false }),

      supabase
        .from('advance_payments')
        .select('client_name, remaining_amount, is_active')
        .in('client_name', clientNames)
        .eq('is_active', true)
    ]);

    const paymentsByClient = new Map<string, { total: number; rejected: number; lastPayment: any }>();
    paymentsResult.data?.forEach(payment => {
      const existing = paymentsByClient.get(payment.client_id) || { total: 0, rejected: 0, lastPayment: null };
      existing.total += Number(payment.amount);
      existing.rejected += Number(payment.rejected_amount || 0);
      if (!existing.lastPayment) {
        existing.lastPayment = payment;
      }
      paymentsByClient.set(payment.client_id, existing);
    });

    const advancesByClient = new Map<string, number>();
    advancesResult.data?.forEach(advance => {
      advancesByClient.set(advance.client_name, Number(advance.remaining_amount) || 0);
    });

    const clientSummaries: ClientSummary[] = usersData.map(user => {
      const payments = paymentsByClient.get(user.id) || { total: 0, rejected: 0, lastPayment: null };
      const lastPaymentDate = payments.lastPayment?.payment_upto_date;

      const unpaidDues = duesResult.data?.filter(due =>
        due.client_name === user.name &&
        (!lastPaymentDate || due.date > lastPaymentDate)
      ) || [];

      const unpaidDuesTotal = unpaidDues.reduce((sum, due) => sum + Number(due.amount), 0);
      const netDue = unpaidDuesTotal + payments.rejected;
      const advanceAmount = advancesByClient.get(user.name) || 0;
      const hasAdvance = advanceAmount > 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password_hash: user.password_hash,
        totalDues: netDue,
        totalPaidAmount: payments.total,
        lastPaymentDate: lastPaymentDate || null,
        lastPaymentAmount: payments.lastPayment ? Number(payments.lastPayment.amount) : null,
        unpaidDays: unpaidDues.length,
        pricePerMember: Number(user.price_per_member) || 0.8,
        pricePerForeignMember: Number(user.price_per_foreign_member) || Number(user.price_per_member) || 0.8,
        pricePerDpMember: Number(user.price_per_dp_member) || 240,
        advanceAmount: advanceAmount,
        hasAdvance: hasAdvance,
        isBlocked: user.is_blocked || false,
        blockReason: user.block_reason || 'Please Pay your dues to login. Contact Administrator'
      };
    });

    setClients(clientSummaries);
    setLoading(false);
  };

  const getDaysAgo = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const sendPaymentReminder = async (client: ClientSummary) => {
    if (client.totalDues <= 0) {
      alert('This client has no pending dues!');
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: client.id,
        message: `Payment Reminder: Please pay your pending dues of ₹${formatIndianNumber(client.totalDues)}`,
        type: 'warning',
        is_read: false
      });

    if (error) {
      alert('Error sending reminder: ' + error.message);
    } else {
      alert(`Payment reminder sent to ${client.name}!`);
    }
  };

  const handlePaymentDeduction = async () => {
    if (!selectedClient || !deductionAmount || parseFloat(deductionAmount) <= 0) {
      alert('Please enter a valid deduction amount');
      return;
    }

    setUploadingProof(true);
    const amount = parseFloat(deductionAmount);
    let proofUrl = 'admin_deduction';

    if (deductionProof) {
      try {
        const fileExt = deductionProof.name.split('.').pop();
        const fileName = `admin_deduction_${selectedClient.id}_${Date.now()}.${fileExt}`;
        const filePath = `payment_proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(filePath, deductionProof);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(filePath);

        proofUrl = urlData.publicUrl;
      } catch (error: any) {
        alert('Error uploading proof: ' + error.message);
        setUploadingProof(false);
        return;
      }
    }

    const { error } = await supabase
      .from('payments')
      .insert({
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        amount: amount,
        payment_upto_date: new Date().toISOString().split('T')[0],
        payment_date: new Date().toISOString().split('T')[0],
        status: 'approved',
        screenshot_url: proofUrl,
        created_at: new Date().toISOString()
      });

    if (error) {
      alert('Error processing deduction: ' + error.message);
      setUploadingProof(false);
      return;
    }

    alert(`✓ Deducted ₹${amount} from ${selectedClient.name}`);
    setShowDeductionModal(false);
    setDeductionAmount('');
    setDeductionProof(null);
    setSelectedClient(null);
    setUploadingProof(false);
    fetchClientsData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const totalDues = clients.reduce((sum, c) => sum + c.totalDues, 0);
  const totalPaid = clients.reduce((sum, c) => sum + c.totalPaidAmount, 0);
  const clientsWithDues = clients.filter(c => c.totalDues > 0).length;

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-6 shadow-xl mb-6 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Global Controls</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={toggleGlobalLogin}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              globalLoginEnabled
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg'
            }`}
          >
            {globalLoginEnabled ? <CheckCircle size={20} /> : <XCircle size={20} />}
            Client Login: {globalLoginEnabled ? 'ENABLED' : 'DISABLED'}
          </button>

          <button
            onClick={toggleRegistration}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
              registrationEnabled
                ? 'bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg'
                : 'bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white shadow-lg'
            }`}
          >
            {registrationEnabled ? <CheckCircle size={20} /> : <XCircle size={20} />}
            Registration: {registrationEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className={`rounded-2xl p-6 shadow-xl ${isDark ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
          <Users size={32} className="text-white/80 mb-3" />
          <p className="text-white/90 text-sm font-semibold mb-1">Total Clients</p>
          <p className="text-4xl font-black text-white">{clients.length}</p>
        </div>

        <div className={`rounded-2xl p-6 shadow-xl ${isDark ? 'bg-gradient-to-br from-red-600 to-rose-700' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <TrendingDown size={32} className="text-white/80 mb-3" />
          <p className="text-white/90 text-sm font-semibold mb-1">Total Receivable</p>
          <p className="text-4xl font-black text-white">₹{formatIndianNumber(totalDues)}</p>
        </div>

        <div className={`rounded-2xl p-6 shadow-xl ${isDark ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-gradient-to-br from-green-500 to-emerald-600'}`}>
          <CheckCircle size={32} className="text-white/80 mb-3" />
          <p className="text-white/90 text-sm font-semibold mb-1">Total Collected</p>
          <p className="text-4xl font-black text-white">₹{formatIndianNumber(totalPaid)}</p>
        </div>

        <div className={`rounded-2xl p-6 shadow-xl ${isDark ? 'bg-gradient-to-br from-orange-600 to-amber-700' : 'bg-gradient-to-br from-orange-500 to-amber-600'}`}>
          <XCircle size={32} className="text-white/80 mb-3" />
          <p className="text-white/90 text-sm font-semibold mb-1">Pending Clients</p>
          <p className="text-4xl font-black text-white">{clientsWithDues}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div
            key={client.id}
            className={`rounded-2xl shadow-xl border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
              client.hasAdvance
                ? (isDark ? 'bg-gradient-to-br from-green-900 to-emerald-900 border-green-500' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400')
                : client.totalDues > 0
                ? (isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-red-500' : 'bg-white border-red-300')
                : (isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600' : 'bg-white border-gray-300')
            }`}
          >
            <div className={`p-6 ${
              client.hasAdvance
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : client.totalDues > 0
                ? 'bg-gradient-to-r from-red-600 to-rose-600'
                : 'bg-gradient-to-r from-slate-600 to-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">{client.name}</h3>
                  <p className="text-white/80 text-sm font-semibold">{client.email}</p>
                </div>
                {client.hasAdvance && (
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <p className="text-white text-xs font-black">ADVANCE</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl p-4 ${
                  client.hasAdvance
                    ? (isDark ? 'bg-green-800/30' : 'bg-green-100')
                    : (isDark ? 'bg-red-800/30' : 'bg-red-50')
                }`}>
                  <p className={`text-xs font-bold mb-1 ${
                    client.hasAdvance
                      ? (isDark ? 'text-green-300' : 'text-green-700')
                      : (isDark ? 'text-red-300' : 'text-red-700')
                  }`}>Net Due</p>
                  <p className={`text-2xl font-black ${
                    client.hasAdvance
                      ? (isDark ? 'text-green-400' : 'text-green-600')
                      : (isDark ? 'text-red-400' : 'text-red-600')
                  }`}>
                    ₹{formatIndianNumber(client.totalDues)}
                  </p>
                  {client.unpaidDays > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{client.unpaidDays} days</p>
                  )}
                </div>

                <div className={`rounded-xl p-4 ${isDark ? 'bg-emerald-800/30' : 'bg-emerald-50'}`}>
                  <p className={`text-xs font-bold mb-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Total Paid</p>
                  <p className={`text-2xl font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    ₹{formatIndianNumber(client.totalPaidAmount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{getDaysAgo(client.lastPaymentDate)}</p>
                </div>
              </div>

              <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100'}`}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Username</p>
                    <p className={`font-bold ${isDark ? 'text-cyan-400' : 'text-gray-900'}`}>{client.email}</p>
                  </div>
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password</p>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${isDark ? 'text-cyan-400' : 'text-gray-900'}`}>{client.password_hash}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(client.password_hash);
                          alert('Password copied!');
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {client.totalDues > 0 && (
                  <button
                    onClick={() => sendPaymentReminder(client)}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105"
                  >
                    <Bell size={14} />
                    Remind
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowRateModal(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105"
                >
                  <DollarSign size={14} />
                  Rates
                </button>
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowDeductionModal(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105"
                >
                  <IndianRupee size={14} />
                  Deduct
                </button>
                <button
                  onClick={() => {
                    const currentUser = localStorage.getItem('user');
                    if (currentUser) {
                      localStorage.setItem('admin_user_backup', currentUser);
                    }
                    localStorage.setItem('impersonate_client_id', client.id);
                    localStorage.setItem('impersonate_client_name', client.name);
                    window.location.reload();
                  }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105"
                >
                  <LogIn size={14} />
                  Login
                </button>
                <button
                  onClick={async () => {
                    const newPassword = prompt(`Enter new password for ${client.name}:`);
                    if (newPassword && newPassword.length >= 6) {
                      await supabase
                        .from('users')
                        .update({ password_hash: newPassword })
                        .eq('id', client.id);
                      alert('Password changed!');
                      fetchClientsData();
                    } else if (newPassword) {
                      alert('Password must be at least 6 characters');
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105"
                >
                  <Key size={14} />
                  Password
                </button>
                <button
                  onClick={() => toggleClientBlock(client.id, client.isBlocked)}
                  className={`flex items-center justify-center gap-2 ${
                    client.isBlocked
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                  } text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105`}
                >
                  {client.isBlocked ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {client.isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Delete ${client.name}? This cannot be undone!`)) {
                      await supabase
                        .from('users')
                        .delete()
                        .eq('id', client.id);
                      alert('Client deleted!');
                      fetchClientsData();
                    }
                  }}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-pink-700 hover:from-red-800 hover:to-pink-800 text-white px-3 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg hover:scale-105"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div className={`text-center py-20 rounded-2xl border-4 border-dashed ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'
        }`}>
          <Users size={64} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-bold text-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No clients found</p>
        </div>
      )}

      {showRateModal && selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-8 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className={`text-2xl font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Adjust Rates - {selectedClient.name}</h3>

            <div className="space-y-3">
              <button
                onClick={async () => {
                  const newRate = prompt(`Enter new rate for Indian Members:`, selectedClient.pricePerMember.toString());
                  if (newRate && !isNaN(Number(newRate))) {
                    await supabase
                      .from('users')
                      .update({ price_per_member: Number(newRate) })
                      .eq('id', selectedClient.id);
                    alert('Indian member rate updated!');
                    fetchClientsData();
                    setShowRateModal(false);
                  }
                }}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
              >
                <span>Indian Members</span>
                <span className="text-sm">₹{selectedClient.pricePerMember}</span>
              </button>

              <button
                onClick={async () => {
                  const newRate = prompt(`Enter new rate for Foreign Members:`, selectedClient.pricePerForeignMember.toString());
                  if (newRate && !isNaN(Number(newRate))) {
                    await supabase
                      .from('users')
                      .update({ price_per_foreign_member: Number(newRate) })
                      .eq('id', selectedClient.id);
                    alert('Foreign member rate updated!');
                    fetchClientsData();
                    setShowRateModal(false);
                  }
                }}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
              >
                <span>Foreign Members</span>
                <span className="text-sm">₹{selectedClient.pricePerForeignMember}</span>
              </button>

              <button
                onClick={async () => {
                  const newRate = prompt(`Enter new rate for DP Members:`, selectedClient.pricePerDpMember.toString());
                  if (newRate && !isNaN(Number(newRate))) {
                    await supabase
                      .from('users')
                      .update({ price_per_dp_member: Number(newRate) })
                      .eq('id', selectedClient.id);
                    alert('DP member rate updated!');
                    fetchClientsData();
                    setShowRateModal(false);
                  }
                }}
                className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
              >
                <span>DP Members</span>
                <span className="text-sm">₹{selectedClient.pricePerDpMember}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowRateModal(false);
                setSelectedClient(null);
              }}
              className={`w-full mt-6 px-6 py-3 rounded-xl font-bold transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showDeductionModal && selectedClient && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className={`max-w-lg w-full rounded-2xl shadow-2xl p-8 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className={`text-2xl font-black mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Deduct Payment - {selectedClient.name}</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Current Net Due: <span className="font-bold text-red-600">₹{formatIndianNumber(selectedClient.totalDues)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Deduction Amount (₹)
                </label>
                <input
                  type="number"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="Enter amount"
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-red-500 outline-none font-bold text-lg ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                  min="0"
                  step="0.01"
                />
              </div>

              {deductionAmount && parseFloat(deductionAmount) > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4">
                  <p className="text-sm font-black text-blue-900 mb-2">After Deduction:</p>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-800 font-semibold">Remaining Due:</span>
                    <span className="font-black text-green-600 text-2xl">
                      ₹{formatIndianNumber(Math.max(0, selectedClient.totalDues - parseFloat(deductionAmount)))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Payment Proof (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setDeductionProof(e.target.files?.[0] || null)}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handlePaymentDeduction}
                disabled={uploadingProof}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-black shadow-lg hover:scale-105 transition-all disabled:opacity-50"
              >
                {uploadingProof ? 'Processing...' : 'Deduct'}
              </button>
              <button
                onClick={() => {
                  setShowDeductionModal(false);
                  setDeductionAmount('');
                  setDeductionProof(null);
                  setSelectedClient(null);
                }}
                className={`flex-1 px-6 py-3 rounded-xl font-black transition-all ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
