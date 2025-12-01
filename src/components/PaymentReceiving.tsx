import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IndianRupee, Eye, Check, X, Calendar, ChevronDown, ChevronUp, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PaymentReceiving {
  id: string;
  client_id: string;
  client_name: string;
  amount: number;
  payment_date: string;
  screenshot_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  is_custom_amount?: boolean;
}

interface ApprovedPayment {
  id: string;
  client_name: string;
  amount: number;
  payment_date: string;
  screenshot_url: string;
  approved_at: string;
}

interface EstimatedEarning {
  id: string;
  date: string;
  amount: number;
  description: string;
  month: string;
}

interface PaymentReceivingProps {
  onApprove: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function PaymentReceiving({ onApprove, isOpen, onToggle }: PaymentReceivingProps) {
  const { isDark } = useTheme();
  const [pendingPayments, setPendingPayments] = useState<PaymentReceiving[]>([]);
  const [approvedPayments, setApprovedPayments] = useState<ApprovedPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentReceiving | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproved, setShowApproved] = useState(false);
  const [estimatedEarnings, setEstimatedEarnings] = useState<EstimatedEarning[]>([]);
  const [showAddEstimate, setShowAddEstimate] = useState(false);
  const [estimateDate, setEstimateDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimateAmount, setEstimateAmount] = useState('');
  const [estimateDescription, setEstimateDescription] = useState('');
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedMonthForEarnings, setSelectedMonthForEarnings] = useState(new Date());
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [monthlyReceivedPayments, setMonthlyReceivedPayments] = useState(0);
  const [showCalendar, setShowCalendar] = useState(true);
  const [dailyEarnings, setDailyEarnings] = useState<{[key: string]: number}>({});
  const [dailyPayments, setDailyPayments] = useState<{[key: string]: {amount: number, clients: string[]}}>({});

  useEffect(() => {
    fetchPendingPayments();
    fetchApprovedPayments();
    fetchEstimatedEarnings();
    fetchClients();
    fetchMonthlyData();
  }, [selectedMonthForEarnings]);

  useEffect(() => {
    fetchPendingPayments();
    fetchApprovedPayments();
    fetchEstimatedEarnings();
    fetchClients();

    const subscription = supabase
      .channel('payment_receiving_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_receiving'
      }, () => {
        fetchPendingPayments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        fetchApprovedPayments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'estimated_earnings'
      }, () => {
        fetchEstimatedEarnings();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentMonth]);

  const fetchPendingPayments = async () => {
    const { data } = await supabase
      .from('payment_receiving')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setPendingPayments(data);
    }
  };

  const fetchApprovedPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'approved')
      .order('payment_date', { ascending: false });

    if (data) {
      setApprovedPayments(data);
    }
  };

  const getRandomCompliment = () => {
    const compliments = [
      "आपकी ईमानदारी देखकर दिल खुश हो गया! 🙏",
      "बहुत बढ़िया! आपका समय पर भुगतान सराहनीय है! 👏",
      "शानदार! आपकी प्रतिबद्धता काबिले तारीफ है! 🌟",
      "वाह! आप एक जिम्मेदार क्लाइंट हैं! 🎯",
      "बेहतरीन! आपकी पंक्चुअलिटी लाजवाब है! ⭐",
      "कमाल है! आपकी निष्ठा प्रशंसनीय है! 💫",
      "धन्यवाद! आपका भुगतान समय पर मिला! 🙌",
      "आप एक आदर्श क्लाइंट हैं! बहुत अच्छा! 🎊"
    ];
    return compliments[Math.floor(Math.random() * compliments.length)];
  };

  const handleApprove = async (payment: PaymentReceiving) => {
    const compliment = getRandomCompliment();

    let paymentUptoDate = payment.payment_date;

    if (payment.is_custom_amount) {
      console.log('Custom amount payment detected:', payment.amount);

      const { data: dailyDuesData } = await supabase
        .from('daily_dues')
        .select('*')
        .eq('client_id', payment.client_id)
        .order('date', { ascending: true });

      console.log('All daily dues for client:', dailyDuesData);

      if (dailyDuesData && dailyDuesData.length > 0) {
        const { data: lastPayment } = await supabase
          .from('payments')
          .select('payment_upto_date')
          .eq('client_id', payment.client_id)
          .eq('status', 'approved')
          .order('payment_upto_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Last payment date:', lastPayment?.payment_upto_date);

        const unpaidDues = lastPayment
          ? dailyDuesData.filter(d => d.date > lastPayment.payment_upto_date)
          : dailyDuesData;

        console.log('Unpaid dues:', unpaidDues);

        let remainingAmount = payment.amount;
        let settledDate = unpaidDues[0]?.date || new Date().toISOString().split('T')[0];

        for (const due of unpaidDues) {
          console.log(`Processing due: ${due.date}, amount: ${due.amount}, remaining: ${remainingAmount}`);
          if (remainingAmount >= due.amount) {
            remainingAmount -= due.amount;
            settledDate = due.date;
            console.log(`Settled ${due.date}, new settled date: ${settledDate}, remaining: ${remainingAmount}`);
          } else {
            console.log(`Not enough to settle ${due.date}, stopping`);
            break;
          }
        }

        console.log('Final settled date:', settledDate);
        paymentUptoDate = settledDate;
      } else {
        paymentUptoDate = new Date().toISOString().split('T')[0];
      }
    }

    console.log('Inserting payment with upto date:', paymentUptoDate);

    const { error: insertError, data: insertedPayment } = await supabase
      .from('payments')
      .insert({
        client_id: payment.client_id,
        client_name: payment.client_name,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_upto_date: paymentUptoDate,
        screenshot_url: payment.screenshot_url,
        status: 'approved',
        approved_by: 'admin',
        approved_at: new Date().toISOString()
      })
      .select();

    if (!insertError) {
      console.log('Payment inserted successfully:', insertedPayment);

      await supabase
        .from('payment_receiving')
        .delete()
        .eq('id', payment.id);

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('action_type', 'payment_received')
        .ilike('message', `%${payment.client_name}%`);

      await supabase
        .from('notifications')
        .insert({
          user_id: payment.client_id,
          user_name: payment.client_name,
          title: '✅ Payment Approved!',
          message: `${compliment}\n\nYour payment of ₹${payment.amount.toLocaleString('en-IN')} has been approved. ${payment.is_custom_amount ? `Dues settled up to ${new Date(paymentUptoDate).toLocaleDateString('en-IN')}` : 'Amount adjusted in your panel.'}`,
          action_type: 'payment_approved',
          reference_id: payment.id,
          is_read: false
        });

      setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
      fetchApprovedPayments();
      fetchMonthlyData();
      onApprove();
      alert(`Payment approved! Settled up to ${new Date(paymentUptoDate).toLocaleDateString('en-IN')}`);
    } else {
      console.error('Error inserting payment:', insertError);
      alert('Error approving payment: ' + insertError.message);
    }
  };

  const handleReject = async (payment: PaymentReceiving) => {
    await supabase
      .from('notifications')
      .insert({
        user_id: payment.client_id,
        user_name: payment.client_name,
        title: '❌ Payment Rejected',
        message: `Your payment submission of ₹${payment.amount.toLocaleString('en-IN')} for ${new Date(payment.payment_date).toLocaleDateString('en-IN')} has been rejected.\n\nReason: ${rejectReason || 'Not specified'}\n\nPlease contact admin for more details.`,
        action_type: 'payment_rejected',
        reference_id: payment.id,
        is_read: false
      });

    await supabase
      .from('payment_receiving')
      .delete()
      .eq('id', payment.id);

    setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
    setSelectedPayment(null);
    setRejectReason('');
    alert('Payment rejected and deleted!');
  };

  const handleDeleteApprovedPayment = async (paymentId: string, clientName: string, paymentUptoDate: string) => {
    if (!confirm('Delete this approved payment? Dues will be restored.')) return;

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (!error) {
      fetchApprovedPayments();
      alert('Payment deleted and dues restored!');
    } else {
      alert('Error deleting payment: ' + error.message);
    }
  };

  const fetchMonthlyData = async () => {
    const year = selectedMonthForEarnings.getFullYear();
    const month = selectedMonthForEarnings.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data: duesData } = await supabase
      .from('daily_dues')
      .select('date, amount')
      .gte('date', startDate)
      .lte('date', endDate);

    const totalEarnings = duesData?.reduce((sum, due) => sum + Number(due.amount), 0) || 0;
    setMonthlyEarnings(totalEarnings);

    const earningsByDate: {[key: string]: number} = {};
    duesData?.forEach(due => {
      const dateKey = due.date;
      earningsByDate[dateKey] = (earningsByDate[dateKey] || 0) + Number(due.amount);
    });
    setDailyEarnings(earningsByDate);

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount, payment_date, client_name')
      .eq('status', 'approved')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate);

    const totalReceived = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
    setMonthlyReceivedPayments(totalReceived);

    const paymentsByDate: {[key: string]: {amount: number, clients: string[]}} = {};
    paymentsData?.forEach(payment => {
      const dateKey = payment.payment_date;
      if (!paymentsByDate[dateKey]) {
        paymentsByDate[dateKey] = { amount: 0, clients: [] };
      }
      paymentsByDate[dateKey].amount += Number(payment.amount);
      paymentsByDate[dateKey].clients.push(payment.client_name);
    });
    setDailyPayments(paymentsByDate);
  };

  const fetchEstimatedEarnings = async () => {
    const { data } = await supabase
      .from('estimated_earnings')
      .select('*')
      .eq('month', currentMonth)
      .order('date', { ascending: true });

    if (data) {
      setEstimatedEarnings(data);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('users')
      .select('name')
      .eq('role', 'client')
      .order('name');
  };


  const handleAddEstimate = async () => {
    if (!estimateAmount || !estimateDate) {
      alert('Please fill in all fields');
      return;
    }

    const { error } = await supabase
      .from('estimated_earnings')
      .insert({
        date: estimateDate,
        amount: parseFloat(estimateAmount),
        description: estimateDescription,
        month: estimateDate.slice(0, 7)
      });

    if (!error) {
      setEstimateAmount('');
      setEstimateDescription('');
      setEstimateDate(new Date().toISOString().split('T')[0]);
      setShowAddEstimate(false);
      fetchEstimatedEarnings();
    }
  };

  const handleUpdateEstimate = async (id: string) => {
    const { error } = await supabase
      .from('estimated_earnings')
      .update({
        amount: parseFloat(editAmount),
        description: editDescription
      })
      .eq('id', id);

    if (!error) {
      setEditingEstimate(null);
      setEditAmount('');
      setEditDescription('');
      fetchEstimatedEarnings();
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      await supabase
        .from('estimated_earnings')
        .delete()
        .eq('id', id);

      fetchEstimatedEarnings();
    }
  };

  const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalEstimatedAmount = estimatedEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const toBeReceived = totalEstimatedAmount - totalApprovedAmount;

  const generateCalendarDays = () => {
    const year = selectedMonthForEarnings.getFullYear();
    const month = selectedMonthForEarnings.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  if (!isOpen) return null;

  return (
    <div className={`rounded-3xl shadow-2xl p-8 border-4 animate-fadeIn ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 border-gray-700' : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200'}`}>
      <div className="flex items-center gap-4 mb-8">
        <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-4 rounded-2xl shadow-2xl transform hover:scale-110 transition-all duration-300">
          <IndianRupee size={32} className="text-white" />
          {pendingPayments.length > 0 && (
            <span className="absolute -top-3 -right-3 bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-black w-8 h-8 rounded-full flex items-center justify-center shadow-2xl animate-bounce border-2 border-white">
              {pendingPayments.length}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h2 className={`text-3xl font-black ${isDark ? 'text-emerald-400' : 'bg-gradient-to-r from-emerald-700 to-teal-700 bg-clip-text text-transparent'}`}>Payment Receiving Center</h2>
          <p className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Manage and approve incoming payments</p>
        </div>
        {pendingPayments.length > 0 && (
          <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-black px-6 py-3 rounded-full animate-pulse shadow-xl border-2 border-white">
            {pendingPayments.length} Pending Approval
          </span>
        )}
        <button
          onClick={onToggle}
          className="bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 p-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-110"
          title="Minimize"
        >
          <ChevronUp size={24} className="text-gray-700" />
        </button>
      </div>

      <div className="space-y-6">
        <div className={`rounded-xl p-5 border-2 ${isDark ? 'bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-700' : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newDate = new Date(selectedMonthForEarnings);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedMonthForEarnings(newDate);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all shadow-md"
                title="Previous Month"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className={`text-xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                {selectedMonthForEarnings.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => {
                  const newDate = new Date(selectedMonthForEarnings);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedMonthForEarnings(newDate);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all shadow-md"
                title="Next Month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={() => setShowAddEstimate(!showAddEstimate)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              Add Entry
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`rounded-lg p-4 border-2 ${isDark ? 'bg-gradient-to-br from-orange-900/30 to-rose-900/30 border-orange-700' : 'bg-gradient-to-br from-orange-50 to-rose-50 border-orange-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-orange-400' : 'text-gray-700'}`}>Estimated Earnings</p>
              <div className="flex items-center gap-1">
                <IndianRupee size={24} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                <span className={`text-3xl font-black ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{monthlyEarnings.toLocaleString('en-IN')}</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total meetings amount for {selectedMonthForEarnings.toLocaleDateString('en-IN', { month: 'short' })}</p>
            </div>
            <div className={`rounded-lg p-4 border-2 ${isDark ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-700' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'}`}>
              <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-green-400' : 'text-gray-700'}`}>Received</p>
              <div className="flex items-center gap-1">
                <IndianRupee size={24} className={isDark ? 'text-green-400' : 'text-green-600'} />
                <span className={`text-3xl font-black ${isDark ? 'text-green-400' : 'text-green-600'}`}>{monthlyReceivedPayments.toLocaleString('en-IN')}</span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Approved payments for {selectedMonthForEarnings.toLocaleDateString('en-IN', { month: 'short' })}</p>
            </div>
          </div>

          <div className={`rounded-xl p-4 border-2 mb-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-blue-200'}`}>
            <h4 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Calendar size={20} className="text-blue-600" />
              Date-wise Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-lg p-3 border ${isDark ? 'bg-gradient-to-br from-orange-900/30 to-amber-900/30 border-orange-700' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'}`}>
                <p className={`text-xs font-bold mb-2 ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>📊 Earnings</p>
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className={`text-center text-[10px] font-bold ${isDark ? 'text-orange-400' : 'text-gray-700'}`}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    const dateKey = `${selectedMonthForEarnings.getFullYear()}-${String(selectedMonthForEarnings.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const amount = dailyEarnings[dateKey] || 0;
                    const hasEarnings = amount > 0;
                    return (
                      <div
                        key={day}
                        className={`aspect-square flex flex-col items-center justify-center rounded font-bold transition-all ${hasEarnings ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md hover:scale-105 cursor-pointer' : isDark ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-100 text-gray-400'}`}
                        title={hasEarnings ? `Date: ${day}\\n₹${amount.toLocaleString('en-IN')}` : `${day}`}
                      >
                        <span className="text-xs">{day}</span>
                        {hasEarnings && <span className="text-sm leading-tight font-black mt-0.5">₹{amount.toLocaleString('en-IN')}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`rounded-lg p-3 border ${isDark ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-700' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'}`}>
                <p className={`text-xs font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>💰 Payments</p>
                <div className="grid grid-cols-7 gap-1 mb-1.5">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className={`text-center text-[10px] font-bold ${isDark ? 'text-green-400' : 'text-gray-700'}`}>{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {generateCalendarDays().map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    const dateKey = `${selectedMonthForEarnings.getFullYear()}-${String(selectedMonthForEarnings.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const paymentData = dailyPayments[dateKey];
                    const hasPayment = paymentData && paymentData.amount > 0;
                    const clients = paymentData?.clients || [];
                    return (
                      <div
                        key={day}
                        className={`aspect-square flex flex-col items-center justify-center rounded font-bold transition-all ${hasPayment ? 'bg-gradient-to-br from-green-500 to-emerald-700 text-white shadow-md hover:scale-105 cursor-pointer' : isDark ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-100 text-gray-400'}`}
                        title={hasPayment ? `Date: ${day}\\n₹${paymentData.amount.toLocaleString('en-IN')}\\nClients: ${clients.join(', ')}` : `${day}`}
                      >
                        <span className="text-xs">{day}</span>
                        {hasPayment && <span className="text-sm leading-tight font-black mt-0.5">₹{paymentData.amount.toLocaleString('en-IN')}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {showAddEstimate && (
            <div className={`rounded-xl p-4 border-2 mb-4 ${isDark ? 'bg-gray-800 border-blue-700' : 'bg-white border-blue-300'}`}>
              <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Add New Entry</h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <input
                  type="date"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className={`px-3 py-2 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
                <input
                  type="number"
                  value={estimateAmount}
                  onChange={(e) => setEstimateAmount(e.target.value)}
                  placeholder="Amount"
                  className={`px-3 py-2 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
                <input
                  type="text"
                  value={estimateDescription}
                  onChange={(e) => setEstimateDescription(e.target.value)}
                  placeholder="Description"
                  className={`px-3 py-2 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddEstimate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddEstimate(false);
                    setEstimateAmount('');
                    setEstimateDescription('');
                  }}
                  className={`flex-1 font-bold py-2 px-4 rounded-lg transition-all ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {estimatedEarnings.length === 0 ? (
              <p className={`text-center py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No estimated earnings added yet</p>
            ) : (
              estimatedEarnings.map((entry) => (
                <div key={entry.id} className={`rounded-lg p-3 border transition-all ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                  {editingEstimate === entry.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="px-2 py-1 rounded border border-gray-300 text-sm"
                        />
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="px-2 py-1 rounded border border-gray-300 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateEstimate(entry.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingEstimate(null);
                            setEditAmount('');
                            setEditDescription('');
                          }}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold py-1 px-3 rounded transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-gray-500" />
                          <span className="text-xs font-semibold text-gray-700">
                            {new Date(entry.date).toLocaleDateString('en-IN')}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600">{entry.description || 'No description'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <IndianRupee size={14} className="text-blue-600" />
                          <span className="text-lg font-bold text-blue-600">{Number(entry.amount).toLocaleString('en-IN')}</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingEstimate(entry.id);
                            setEditAmount(entry.amount.toString());
                            setEditDescription(entry.description);
                          }}
                          className="p-1 bg-blue-100 hover:bg-blue-200 rounded transition-all"
                        >
                          <Edit2 size={14} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteEstimate(entry.id)}
                          className="p-1 bg-red-100 hover:bg-red-200 rounded transition-all"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-black text-transparent bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text mb-6 flex items-center gap-3">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-base shadow-xl border-2 border-white">
              {pendingPayments.length}
            </span>
            Pending Payment Approvals
          </h3>

          {pendingPayments.length === 0 ? (
            <div className={`text-center py-12 rounded-2xl border-4 border-dashed shadow-inner ${isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-300'}`}>
              <IndianRupee size={64} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-xl font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No pending payments</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>All payments have been processed</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pendingPayments.map(payment => (
                <div
                  key={payment.id}
                  className={`rounded-2xl shadow-2xl border-4 p-6 hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] transform hover:-translate-y-1 ${isDark ? 'bg-gradient-to-br from-gray-800 via-orange-900/20 to-red-900/20 border-orange-700' : 'bg-gradient-to-br from-white via-orange-50 to-red-50 border-orange-300'}`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 animate-pulse"></div>
                        <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent'}`}>{payment.client_name}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar size={16} className="text-orange-600" />
                        <span className={`text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                          {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className={`text-right px-6 py-4 rounded-2xl border-3 shadow-lg ${isDark ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-700' : 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300'}`}>
                      <p className={`text-xs font-bold mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Payment Amount</p>
                      <div className="flex items-center gap-2 justify-end">
                        <IndianRupee size={28} className={isDark ? 'text-green-400' : 'text-green-700'} />
                        <span className={`text-4xl font-black ${isDark ? 'text-green-400' : 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'}`}>
                          {payment.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => window.open(payment.screenshot_url, '_blank')}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-black py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-110 hover:-translate-y-1"
                    >
                      <Eye size={22} />
                      View Screenshot
                    </button>
                    <button
                      onClick={() => handleApprove(payment)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-black py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-110 hover:-translate-y-1"
                    >
                      <Check size={22} />
                      Approve Payment
                    </button>
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-black py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-110 hover:-translate-y-1"
                    >
                      <X size={22} />
                      Reject Payment
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete payment from ${payment.client_name}? No notification will be sent.`)) {
                          await supabase.from('payment_receiving').delete().eq('id', payment.id);
                          setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
                          alert('Payment deleted!');
                        }
                      }}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-black py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-110 hover:-translate-y-1"
                    >
                      <Trash2 size={22} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            onClick={() => setShowApproved(!showApproved)}
            className="w-full flex items-center justify-between bg-green-100 hover:bg-green-200 p-4 rounded-xl transition-all shadow-md"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-green-700 flex items-center gap-2">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                  {approvedPayments.length}
                </span>
                Received Payments
              </h3>
              <div className="flex items-center gap-2">
                <IndianRupee size={20} className="text-green-700" />
                <span className="text-2xl font-black text-green-700">
                  {totalApprovedAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            {showApproved ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>

          {showApproved && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {approvedPayments.map(payment => {
                const isAdminDeduction = payment.screenshot_url === 'admin_deduction';
                const hasProof = payment.screenshot_url && payment.screenshot_url !== 'admin_deduction';
                return (
                  <div
                    key={payment.id}
                    className={`rounded-xl shadow-md border-2 p-4 hover:shadow-lg transition-all duration-300 ${
                      isAdminDeduction
                        ? (isDark ? 'bg-purple-900/30 border-purple-600' : 'bg-purple-50 border-purple-400')
                        : (isDark ? 'bg-gray-800 border-green-700' : 'bg-white border-green-300')
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{payment.client_name}</h4>
                          {isAdminDeduction && (
                            <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              Admin Deduction
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar size={12} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <IndianRupee size={18} className="text-green-600" />
                          <span className="text-2xl font-black text-green-600">
                            {payment.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        {hasProof && (
                          <button
                            onClick={() => window.open(payment.screenshot_url, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all"
                            title={isAdminDeduction ? "View Payment Proof" : "View Screenshot"}
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteApprovedPayment(payment.id, payment.client_name, payment.payment_date)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
                          title={isAdminDeduction ? "Delete Deduction (will restore dues)" : "Delete Payment"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Reject Payment</h3>
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Are you sure you want to reject payment from <strong>{selectedPayment.client_name}</strong>?
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className={`w-full px-4 py-3 rounded-xl border focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all mb-4 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleReject(selectedPayment);
                  setRejectReason('');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setRejectReason('');
                }}
                className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all duration-300 ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
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
