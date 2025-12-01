import { useState, useEffect, useRef } from 'react';
import { IndianRupee, Wallet, QrCode, Upload, Check, ChevronRight, Calendar, Copy, Download, FileText, X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentFormWizardProps {
  userId: string;
  userName: string;
  dailyDues: Array<{ id: string; date: string; amount: number; meeting_count?: number }>;
  totalNetDue: number;
  onSuccess: () => void;
}

export function PaymentFormWizard({ userId, userName, dailyDues, totalNetDue, onSuccess }: PaymentFormWizardProps) {
  const [step, setStep] = useState(1);
  const [paymentUptoDate, setPaymentUptoDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'crypto' | ''>('');
  const [cryptoNetwork, setCryptoNetwork] = useState<'trc20' | 'bep20' | ''>('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [isFullSettlement, setIsFullSettlement] = useState(false);
  const customAmountInputRef = useRef<HTMLInputElement>(null);

  const [upiId, setUpiId] = useState('');
  const [upiQrCode, setUpiQrCode] = useState('');
  const [trc20Address, setTrc20Address] = useState('');
  const [trc20QrCode, setTrc20QrCode] = useState('');
  const [bep20Address, setBep20Address] = useState('');
  const [bep20QrCode, setBep20QrCode] = useState('');
  const [lastPaidDate, setLastPaidDate] = useState<string | null>(null);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [unpaidDues, setUnpaidDues] = useState<Array<{ id: string; date: string; amount: number; meeting_count?: number }>>([]);
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<string | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<Array<{ id: string; title: string; scheduled_date: string; scheduled_time: string; duration_minutes: number }>>([]);

  useEffect(() => {
    fetchPaymentMethods();
    fetchLastPaymentDate();
    fetchTotalPaidAmount();
  }, [userId]);

  useEffect(() => {
    filterUnpaidDues();
  }, [dailyDues, lastPaidDate]);

  const filterUnpaidDues = () => {
    if (!lastPaidDate) {
      setUnpaidDues(dailyDues);
      return;
    }

    const filtered = dailyDues.filter(due => due.date > lastPaidDate);
    setUnpaidDues(filtered);
  };

  const fetchPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .single();

    if (data) {
      setUpiId(data.upi_id || '');
      setUpiQrCode(data.qr_code_url || '');
      setTrc20Address(data.usdt_trc20_address || '');
      setTrc20QrCode(data.usdt_trc20_qr || '');
      setBep20Address(data.usdt_bep20_address || '');
      setBep20QrCode(data.usdt_bep20_qr || '');
    }
  };

  const fetchLastPaymentDate = async () => {
    const { data } = await supabase
      .from('payments')
      .select('payment_upto_date')
      .eq('client_id', userId)
      .eq('status', 'approved')
      .order('payment_upto_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && data.payment_upto_date) {
      setLastPaidDate(data.payment_upto_date);
    }
  };

  const fetchTotalPaidAmount = async () => {
    const { data } = await supabase
      .from('payments')
      .select('amount')
      .eq('client_id', userId)
      .eq('status', 'approved');

    if (data) {
      const total = data.reduce((sum, payment) => sum + Number(payment.amount), 0);
      setTotalPaidAmount(total);
    }
  };

  const fetchMeetingDetailsForDate = async (date: string) => {
    const { data } = await supabase
      .from('meetings')
      .select('id, title, scheduled_date, scheduled_time, duration_minutes')
      .eq('scheduled_date', date)
      .eq('client_id', userId)
      .eq('attendance_status', 'attended')
      .order('scheduled_time', { ascending: true });

    if (data) {
      setMeetingDetails(data);
      setSelectedDateForDetails(date);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Address copied to clipboard!');
  };

  const downloadQR = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleDateSelect = (date: string) => {
    setPaymentUptoDate(date);
    if (isFullSettlement) {
      setPaymentAmount(totalNetDue);
    } else {
      const reversedDues = [...unpaidDues].reverse();
      const selectedIndex = reversedDues.findIndex(d => d.date === date);
      if (selectedIndex !== -1) {
        const cumulativeAmount = reversedDues
          .slice(0, selectedIndex + 1)
          .reduce((sum, d) => sum + Number(d.amount), 0);
        setPaymentAmount(cumulativeAmount);
      }
    }
    setStep(2);
  };

  const handlePaymentMethodSelect = (method: 'upi' | 'crypto') => {
    setPaymentMethod(method);
    if (method === 'upi') {
      setStep(4);
    } else {
      setStep(3);
    }
  };

  const handleCryptoNetworkSelect = (network: 'trc20' | 'bep20') => {
    setCryptoNetwork(network);
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!paymentScreenshot) {
      alert('Please upload payment screenshot');
      return;
    }

    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-screenshots')
        .upload(filePath, paymentScreenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meeting-screenshots')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('payment_receiving')
        .insert([{
          client_id: userId,
          client_name: userName,
          amount: paymentAmount,
          screenshot_url: publicUrl,
          payment_date: paymentUptoDate === 'custom' ? new Date().toISOString().split('T')[0] : paymentUptoDate,
          payment_method: paymentMethod,
          crypto_network: paymentMethod === 'crypto' ? cryptoNetwork.toUpperCase() : null,
          status: 'pending',
          is_custom_amount: paymentUptoDate === 'custom'
        }]);

      if (insertError) throw insertError;

      const { data: adminData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();

      if (adminData) {
        await supabase
          .from('notifications')
          .insert({
            user_id: adminData.id,
            message: `New ${paymentMethod === 'upi' ? 'UPI' : 'Crypto'} payment received from ${userName} for ₹${paymentAmount}`,
            type: 'success',
            action_type: 'payment_received',
            is_read: false
          });
      }

      alert('Payment submitted successfully! Waiting for admin approval.');
      resetForm();
      onSuccess();
    } catch (error: any) {
      alert('Error uploading payment: ' + error.message);
    }
  };

  const resetForm = () => {
    setStep(1);
    setPaymentUptoDate('');
    setPaymentAmount(0);
    setPaymentMethod('');
    setCryptoNetwork('');
    setPaymentScreenshot(null);
    setIsFullSettlement(false);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-2xl p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-gray-900">Make Payment</h2>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                s <= step
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s < step ? <Check size={18} /> : s}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
                Step 1: Select Payment Option
              </h3>
              <p className="text-sm text-gray-600">Choose payment date or enter custom amount</p>
            </div>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all"
            >
              <FileText size={18} />
              {showBreakdown ? 'Hide' : 'Show'} Breakdown
            </button>
          </div>


          {lastPaidDate && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3">
              <p className="text-sm text-green-800 font-semibold">
                ✓ Payment cleared till: {new Date(lastPaidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {(() => {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istTime = new Date(now.getTime() + istOffset);
            const istHour = istTime.getUTCHours();
            const istMinute = istTime.getUTCMinutes();

            const isAfter930PM = istHour > 21 || (istHour === 21 && istMinute >= 30);

            const settlementDate = new Date();
            if (!isAfter930PM) {
              settlementDate.setDate(settlementDate.getDate() - 1);
            }
            const settlementDateStr = settlementDate.toISOString().split('T')[0];
            const duesTillSettlement = unpaidDues.filter(d => d.date <= settlementDateStr);
            const totalTillSettlement = duesTillSettlement.reduce((sum, d) => sum + Number(d.amount), 0);

            const today = new Date().toISOString().split('T')[0];
            const isToday = settlementDateStr === today;
            const labelText = isToday ? 'today' : new Date(settlementDateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

            return totalTillSettlement > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 mb-1">Final Settlement</h4>
                    <p className="text-sm text-gray-700">Clear all pending dues till {isToday ? 'today' : 'yesterday'}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Settlement till: {labelText}
                      {isAfter930PM && <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">After 9:30 PM IST</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <IndianRupee size={24} className="text-orange-600" />
                      <span className="text-3xl font-black text-orange-600">
                        {totalTillSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsFullSettlement(true);
                      setPaymentAmount(totalTillSettlement);
                      setPaymentUptoDate(settlementDateStr);
                      setStep(2);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                  >
                    <Wallet size={20} />
                    Settle All
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            );
          })()}

          {showBreakdown && unpaidDues.length > 0 && (
            <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 max-h-64 overflow-y-auto">
              <h4 className="text-sm font-bold text-gray-900 mb-3">Date-wise Breakdown (Click to see meetings)</h4>
              <div className="space-y-2">
                {unpaidDues.map((due) => (
                  <button
                    key={due.id}
                    onClick={() => fetchMeetingDetailsForDate(due.date)}
                    className="w-full flex items-center justify-between bg-white hover:bg-blue-50 p-3 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-300"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        {new Date(due.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {due.meeting_count && (
                        <p className="text-xs text-gray-500">{due.meeting_count} meetings</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <IndianRupee size={14} className="text-green-600" />
                      <span className="text-sm font-bold text-green-600">
                        {Number(due.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {unpaidDues.length === 0 ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6 text-center">
                <p className="text-lg font-bold text-green-800">🎉 All payments are up to date!</p>
                <p className="text-sm text-green-600 mt-2">You have no pending dues.</p>
              </div>
            ) : (
              [...unpaidDues].reverse().map((due, index, reversedArray) => {
                const cumulativeAmount = reversedArray
                  .slice(0, index + 1)
                  .reduce((sum, d) => sum + Number(d.amount), 0);

                const totalMeetings = reversedArray
                  .slice(0, index + 1)
                  .reduce((sum, d) => sum + (d.meeting_count || 0), 0);

                return (
                  <button
                    key={due.id}
                    onClick={() => handleDateSelect(due.date)}
                    className="bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          Payment Upto {new Date(due.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{totalMeetings} meetings</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee size={20} className="text-green-600" />
                        <span className="text-2xl font-black text-green-600">
                          {Math.max(0, cumulativeAmount).toLocaleString('en-IN')}
                        </span>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className={`rounded-xl p-4 border-2 shadow-lg ${
            isFullSettlement
              ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-400'
              : paymentUptoDate === 'custom'
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400'
              : 'bg-white border-blue-300'
          }`}>
            {isFullSettlement && (
              <div className="bg-orange-100 border border-orange-400 rounded-lg px-3 py-2 mb-3">
                <p className="text-sm font-black text-orange-700">✓ Final Settlement</p>
                <p className="text-xs text-orange-600 mt-1">
                  All dues will be cleared till {paymentUptoDate === new Date().toISOString().split('T')[0] ? 'today' : 'yesterday'}
                </p>
              </div>
            )}
            {paymentUptoDate === 'custom' && (
              <div className="bg-emerald-100 border border-emerald-400 rounded-lg px-3 py-2 mb-3">
                <p className="text-sm font-black text-emerald-700">✓ Custom Payment</p>
                <p className="text-xs text-emerald-600 mt-1">System will auto-calculate settlement date</p>
              </div>
            )}
            <p className="text-sm text-gray-600">
              {isFullSettlement ? 'Settlement Date' : paymentUptoDate === 'custom' ? 'Payment Type' : 'Payment Upto Date'}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {paymentUptoDate === 'custom'
                ? 'Custom Amount Payment'
                : new Date(paymentUptoDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
              }
            </p>
            <div className="flex items-center gap-2 mt-2">
              <IndianRupee size={24} className={isFullSettlement ? "text-orange-600" : paymentUptoDate === 'custom' ? "text-emerald-600" : "text-green-600"} />
              <span className={`text-3xl font-black ${isFullSettlement ? "text-orange-600" : paymentUptoDate === 'custom' ? "text-emerald-600" : "text-green-600"}`}>
                {paymentAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet size={24} className="text-blue-600" />
            Step 2: Select Payment Method
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handlePaymentMethodSelect('upi')}
              className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-300 hover:border-orange-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <QrCode size={48} className="mx-auto mb-3 text-orange-600" />
              <p className="text-xl font-black text-gray-900">UPI</p>
              <p className="text-xs text-gray-600 mt-1">Pay via UPI/QR Code</p>
            </button>

            <button
              onClick={() => handlePaymentMethodSelect('crypto')}
              className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-300 hover:border-purple-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <Wallet size={48} className="mx-auto mb-3 text-purple-600" />
              <p className="text-xl font-black text-gray-900">Crypto</p>
              <p className="text-xs text-gray-600 mt-1">Pay via USDT</p>
            </button>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setIsFullSettlement(false);
            }}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
          >
            Back
          </button>
        </div>
      )}

      {step === 3 && paymentMethod === 'crypto' && (
        <div className="space-y-6 animate-fadeIn">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet size={24} className="text-purple-600" />
            Step 3: Select Crypto Network
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleCryptoNetworkSelect('trc20')}
              className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border-2 border-green-300 hover:border-green-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <p className="text-2xl font-black text-gray-900 mb-2">TRC20</p>
              <p className="text-xs text-gray-600">TRON Network</p>
            </button>

            <button
              onClick={() => handleCryptoNetworkSelect('bep20')}
              className="bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border-2 border-yellow-300 hover:border-yellow-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
            >
              <p className="text-2xl font-black text-gray-900 mb-2">BEP20</p>
              <p className="text-xs text-gray-600">Binance Smart Chain</p>
            </button>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
          >
            Back
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 animate-fadeIn">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode size={24} className="text-blue-600" />
            Step 4: Complete Payment
          </h3>

          <div className="bg-white rounded-xl p-4 border-2 border-blue-300 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Payment Amount:</span>
              <div className="flex items-center gap-1">
                <IndianRupee size={20} className="text-green-600" />
                <span className="text-2xl font-black text-green-600">
                  {paymentAmount.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Method:</span>
              <span className="text-sm font-bold text-gray-900">
                {paymentMethod === 'upi' ? 'UPI' : `Crypto (${cryptoNetwork?.toUpperCase()})`}
              </span>
            </div>
          </div>

          {paymentMethod === 'upi' && upiQrCode && (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-300">
              <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">Scan QR Code to Pay</h4>
              <div className="flex justify-center mb-4 relative group">
                <img
                  src={upiQrCode}
                  alt="UPI QR Code"
                  className="w-64 h-64 object-contain rounded-lg border-4 border-white shadow-xl"
                />
                <button
                  onClick={() => downloadQR(upiQrCode, 'upi-qr-code.png')}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Download QR Code"
                >
                  <Download size={20} className="text-orange-600" />
                </button>
              </div>
              {upiId && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1 text-center">UPI ID:</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-mono font-bold text-gray-900 break-all">{upiId}</p>
                    <button
                      onClick={() => copyToClipboard(upiId)}
                      className="flex-shrink-0 bg-orange-100 hover:bg-orange-200 p-2 rounded-lg transition-all"
                      title="Copy UPI ID"
                    >
                      <Copy size={16} className="text-orange-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'crypto' && cryptoNetwork === 'trc20' && trc20Address && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-300">
              <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Please make the payment on following address
              </h4>
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-xs text-gray-600 mb-2">Network:</p>
                <p className="text-lg font-bold text-green-700 mb-3">TRC20 (TRON)</p>
                <p className="text-xs text-gray-600 mb-2">Wallet Address:</p>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-mono font-bold text-gray-900 break-all flex-1">{trc20Address}</p>
                  <button
                    onClick={() => copyToClipboard(trc20Address)}
                    className="flex-shrink-0 bg-green-100 hover:bg-green-200 p-2 rounded-lg transition-all"
                    title="Copy Address"
                  >
                    <Copy size={18} className="text-green-600" />
                  </button>
                </div>
              </div>
              {trc20QrCode && (
                <div className="flex justify-center relative group">
                  <img
                    src={trc20QrCode}
                    alt="TRC20 QR Code"
                    className="w-48 h-48 object-contain rounded-lg border-4 border-white shadow-xl"
                  />
                  <button
                    onClick={() => downloadQR(trc20QrCode, 'trc20-qr-code.png')}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Download QR Code"
                  >
                    <Download size={20} className="text-green-600" />
                  </button>
                </div>
              )}
              <p className="text-xs text-center text-gray-600 mt-3">Upload payment screenshot below</p>
            </div>
          )}

          {paymentMethod === 'crypto' && cryptoNetwork === 'bep20' && bep20Address && (
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-300">
              <h4 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Please make the payment on following address
              </h4>
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-xs text-gray-600 mb-2">Network:</p>
                <p className="text-lg font-bold text-yellow-700 mb-3">BEP20 (BSC)</p>
                <p className="text-xs text-gray-600 mb-2">Wallet Address:</p>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-mono font-bold text-gray-900 break-all flex-1">{bep20Address}</p>
                  <button
                    onClick={() => copyToClipboard(bep20Address)}
                    className="flex-shrink-0 bg-yellow-100 hover:bg-yellow-200 p-2 rounded-lg transition-all"
                    title="Copy Address"
                  >
                    <Copy size={18} className="text-yellow-600" />
                  </button>
                </div>
              </div>
              {bep20QrCode && (
                <div className="flex justify-center relative group">
                  <img
                    src={bep20QrCode}
                    alt="BEP20 QR Code"
                    className="w-48 h-48 object-contain rounded-lg border-4 border-white shadow-xl"
                  />
                  <button
                    onClick={() => downloadQR(bep20QrCode, 'bep20-qr-code.png')}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Download QR Code"
                  >
                    <Download size={20} className="text-yellow-600" />
                  </button>
                </div>
              )}
              <p className="text-xs text-center text-gray-600 mt-3">Upload payment screenshot below</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-6 border-2 border-blue-300">
            <label className="block text-sm font-bold text-gray-900 mb-3">
              <Upload size={18} className="inline mr-2" />
              Upload Payment Screenshot *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            {paymentScreenshot && (
              <p className="text-sm text-green-600 mt-2 font-semibold">
                ✓ File selected: {paymentScreenshot.name}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(paymentMethod === 'upi' ? 2 : 3)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!paymentScreenshot}
              className="flex-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-2xl hover:scale-105 disabled:scale-100"
            >
              <Check size={20} />
              Submit Payment
            </button>
          </div>
        </div>
      )}

      {selectedDateForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Meeting Details</h3>
                <p className="text-sm opacity-90">
                  {new Date(selectedDateForDetails).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDateForDetails(null);
                  setMeetingDetails([]);
                }}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {meetingDetails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No meeting details found for this date</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetingDetails.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <h4 className="font-bold text-gray-900 mb-2">{meeting.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span>{meeting.scheduled_time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          <span>{meeting.duration_minutes} mins</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
