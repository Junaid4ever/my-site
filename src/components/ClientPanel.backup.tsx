import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, LogOut, Clock, Users, Trash2, Image as ImageIcon, Loader, Moon, Sun, Calendar, AlertTriangle, Eye, EyeOff, Key, ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getRandomHindiName } from '../utils/indianNameGenerator';
import { PaymentFormWizard } from './PaymentFormWizard';

interface ClientPanelProps {
  user: any;
  onLogout: () => void;
}

interface Meeting {
  id: string;
  meeting_name: string;
  meeting_id: string;
  password: string;
  hour?: number;
  minutes?: number;
  time_period?: 'AM' | 'PM';
  member_count?: number;
  member_type?: 'indian' | 'foreigners';
  is_instant: boolean;
  attended: boolean;
  screenshot_url?: string;
  status?: 'active' | 'not_live' | 'cancelled';
  created_at: string;
}

export function ClientPanel({ user, onLogout }: ClientPanelProps) {
  const { isDark, toggleTheme } = useTheme();
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const breakdownSectionRef = useRef<HTMLDivElement>(null);

  const inputClassName = isDark
    ? 'w-full px-4 py-2.5 rounded-xl border-2 bg-gray-900 border-gray-500 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all duration-300 placeholder-gray-400 shadow-lg'
    : 'w-full px-4 py-2.5 rounded-xl border bg-white border-gray-300 text-gray-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all duration-300';

  const labelClassName = isDark ? 'block text-sm font-semibold text-gray-100 mb-2' : 'block text-sm font-semibold text-gray-700 mb-2';
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [hour, setHour] = useState(8);
  const [minutes, setMinutes] = useState(0);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [memberCount, setMemberCount] = useState(1);
  const [memberType, setMemberType] = useState<'indian' | 'foreigners'>('indian');
  const [isInstant, setIsInstant] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dailyNetDue, setDailyNetDue] = useState(0);
  const [totalNetDueTillToday, setTotalNetDueTillToday] = useState(0);
  const [showDueAmount, setShowDueAmount] = useState(false);
  const [pricePerMember, setPricePerMember] = useState(0);
  const [pricePerForeignMember, setPricePerForeignMember] = useState(0);
  const [pricePerDpMember, setPricePerDpMember] = useState(240);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [myPayments, setMyPayments] = useState<any[]>([]);
  const [upiId, setUpiId] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('TRC20');
  const [advanceBalance, setAdvanceBalance] = useState({ amount: 0, members: 0 });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [dateLabel, setDateLabel] = useState('Today');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [screenshotNotification, setScreenshotNotification] = useState<string | null>(null);
  const [dailyDues, setDailyDues] = useState<any[]>([]);
  const [totalNetDue, setTotalNetDue] = useState(0);
  const [selectedDueDate, setSelectedDueDate] = useState<string | null>(null);
  const [paymentUptoDate, setPaymentUptoDate] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMeetingBreakdown, setShowMeetingBreakdown] = useState(false);
  const [paymentSettledTill, setPaymentSettledTill] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<{id: string; message: string; time: string; read: boolean; type: 'screenshot' | 'payment'}[]>([]);
  const [recurringMeetings, setRecurringMeetings] = useState<any[]>([]);
  const [showRecurringList, setShowRecurringList] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [showSoundControls, setShowSoundControls] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [meetingsCache, setMeetingsCache] = useState<{[key: string]: Meeting[]}>({});
  const [moneySoundPlayed, setMoneySoundPlayed] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

  const playNotificationSound = () => {
    if (soundMuted) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3 * soundVolume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const playMoneyCountingSound = () => {
    if (soundMuted || moneySoundPlayed) return;

    setMoneySoundPlayed(true);

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    let time = audioContext.currentTime;

    notes.forEach((frequency) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(soundVolume * 0.15, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      oscillator.start(time);
      oscillator.stop(time + 0.1);

      time += 0.08;
    });
  };

  const goToPreviousDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const goToNextDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    const nextDate = currentDate.toISOString().split('T')[0];
    if (nextDate <= today) {
      setSelectedDate(nextDate);
    }
  };

  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  };

  const downloadAndShareImage = async (meeting: Meeting) => {
    if (!meeting.screenshot_url) return;

    try {
      const response = await fetch(meeting.screenshot_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.meeting_name}-screenshot.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setTimeout(() => {
        alert('Image downloaded! Now you can manually share it on WhatsApp from your gallery/downloads.');
      }, 500);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const handleOpenAll = () => {
    const filteredMeetings = getFilteredMeetings();
    const meetingsToOpen = filteredMeetings.filter(m => !m.attended && m.status !== 'cancelled');

    if (meetingsToOpen.length === 0) {
      alert('No meetings available to open with the current filter!');
      return;
    }

    if (meetingsToOpen.length > 10) {
      if (!confirm(`You are about to open ${meetingsToOpen.length} meetings. This might slow down your browser. Continue?`)) {
        return;
      }
    }

    meetingsToOpen.forEach((meeting, index) => {
      setTimeout(() => {
        const zoomUrl = `https://zoom.us/wc/join/${meeting.meeting_id}?pwd=${meeting.password}`;
        window.open(zoomUrl, `_blank_${index}`);
      }, index * 300);
    });
  };

  const getFilteredMeetings = () => {
    let filtered = meetings;

    if (timeFilter !== 'all') {
      filtered = meetings.filter(meeting => {
        const meetingHour = meeting.hour || 0;
        const isPM = meeting.time_period === 'PM';
        const hour24 = isPM && meetingHour !== 12 ? meetingHour + 12 : (!isPM && meetingHour === 12 ? 0 : meetingHour);

        switch (timeFilter) {
          case 'morning':
            return hour24 >= 6 && hour24 < 12;
          case 'afternoon':
            return hour24 >= 12 && hour24 < 17;
          case 'evening':
            return hour24 >= 17 && hour24 < 21;
          case 'night':
            return hour24 >= 21 || hour24 < 6;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const handleWhatsAppShare = async (meeting: Meeting) => {
    if (!meeting.screenshot_url) return;

    const message = `Meeting Name - ${meeting.meeting_name}\n\n*Participants added successfully - ${meeting.member_count}*`;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        const response = await fetch(meeting.screenshot_url);
        const blob = await response.blob();
        const file = new File([blob], `${meeting.meeting_name}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: meeting.meeting_name,
            text: message
          });
          return;
        }
      } catch (error) {
        console.error('Native share failed:', error);
      }
    }

    downloadAndShareImage(meeting);
  };

  const fetchMeetings = async (rate?: number) => {
    if (isLoadingMeetings) return;

    setIsLoadingMeetings(true);
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];

    try {
      // Check cache first
      if (meetingsCache[selectedDateStr]) {
        setMeetings(meetingsCache[selectedDateStr]);
        const currentRate = rate !== undefined ? rate : pricePerMember;
        calculateDailyNetDue(meetingsCache[selectedDateStr], currentRate, selectedDate);
        setIsLoadingMeetings(false);
        return;
      }

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('client_name', user?.name)
        .or(`and(scheduled_date.gte.${selectedDateStr},scheduled_date.lte.${selectedDateStr}),and(scheduled_date.is.null,created_at.gte.${startOfDay.toISOString()},created_at.lte.${endOfDay.toISOString()})`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMeetings(data);

        // Cache meetings
        setMeetingsCache(prev => ({
          ...prev,
          [selectedDateStr]: data
        }));

        const currentRate = rate !== undefined ? rate : pricePerMember;
        calculateDailyNetDue(data, currentRate, selectedDate);
      }
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const fetchAdvanceBalance = async () => {
    const { data, error } = await supabase
      .from('advance_payments')
      .select('remaining_amount, remaining_members, is_active')
      .eq('client_id', user?.id)
      .gt('remaining_amount', 0);

    if (!error && data && data.length > 0) {
      const totalAmount = data.reduce((sum, adv) => sum + Number(adv.remaining_amount || 0), 0);
      const totalMembers = data.reduce((sum, adv) => sum + Number(adv.remaining_members || 0), 0);
      setAdvanceBalance({
        amount: totalAmount,
        members: totalMembers
      });
    } else {
      setAdvanceBalance({ amount: 0, members: 0 });
    }
  };

  const fetchRecurringMeetings = async () => {
    const { data, error } = await supabase
      .from('recurring_meetings')
      .select('*')
      .eq('client_id', user?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecurringMeetings(data);
    }
  };

  const removeFromDailyList = async (id: string) => {
    if (!confirm('Remove this meeting from daily recurring list?')) return;

    const { error } = await supabase
      .from('recurring_meetings')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      alert('Error removing from daily list: ' + error.message);
    } else {
      alert('✅ Removed from daily list!');
      fetchRecurringMeetings();
    }
  };

  const fetchDatabaseNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedNotifications = data.map(n => ({
        id: n.id,
        message: n.message,
        time: new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        read: n.is_read,
        type: (n.type === 'success' || n.type === 'error') ? ('payment' as const) : ('screenshot' as const)
      }));
      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read).length);
    }
  };

  const fetchDailyDues = async () => {
    const { data, error } = await supabase
      .from('daily_dues')
      .select('*')
      .eq('client_name', user?.name)
      .order('date', { ascending: false });

    if (!error && data) {
      console.log('Client: All daily dues:', data);

      console.log('Client: Fetching payments for user ID:', user?.id, 'Type:', typeof user?.id);

      const { data: approvedPayments } = await supabase
        .from('payments')
        .select('amount, payment_upto_date')
        .eq('client_id', user?.id)
        .eq('status', 'approved')
        .order('payment_upto_date', { ascending: false });

      console.log('Client: Approved payments:', approvedPayments);
      console.log('Client: Approved payments count:', approvedPayments?.length || 0);

      const { data: rejectedPayments } = await supabase
        .from('payments')
        .select('rejected_amount')
        .eq('client_id', user?.id)
        .eq('status', 'rejected');

      const { data: adjustmentsData } = await supabase
        .from('due_adjustments')
        .select('*')
        .eq('client_id', user?.id)
        .order('date', { ascending: false });

      if (adjustmentsData) {
        setAdjustments(adjustmentsData);
      }

      let paymentSettledDate: string | null = null;
      if (approvedPayments && approvedPayments.length > 0) {
        paymentSettledDate = approvedPayments[0].payment_upto_date;
        setPaymentSettledTill(paymentSettledDate);
        console.log('Client: Payment settled till:', paymentSettledDate);
      } else {
        setPaymentSettledTill(null);
        console.log('Client: No payments found');
      }

      const unsettledDues = paymentSettledDate
        ? data.filter(d => d.date > paymentSettledDate)
        : data;

      console.log('Client: Unsettled dues:', unsettledDues);

      setDailyDues(unsettledDues);

      const totalRejected = rejectedPayments?.reduce((sum, p) => sum + (p.rejected_amount || 0), 0) || 0;
      const totalDue = unsettledDues.reduce((sum, d) => sum + Number(d.amount), 0);

      console.log('Client: Total due:', totalDue, 'Total rejected:', totalRejected);

      setTotalNetDue(totalDue + totalRejected);

      const today = new Date().toISOString().split('T')[0];
      const duesTillToday = unsettledDues.filter(d => d.date <= today);
      const totalDueTillToday = duesTillToday.reduce((sum, d) => sum + Number(d.amount), 0);

      console.log('Client: Dues till today:', duesTillToday, 'Total:', totalDueTillToday);

      setTotalNetDueTillToday(totalDueTillToday + totalRejected);

      const todayDue = unsettledDues.find(d => d.date === today);
      if (todayDue) {
        setDailyNetDue(Number(todayDue.amount));
      } else {
        setDailyNetDue(0);
      }
    }
  };

  const fetchMyPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyPayments(data);
    }
  };

  const fetchPaymentMethods = async () => {
    const { data, error} = await supabase
      .from('payment_methods')
      .select('*')
      .single();

    if (!error && data) {
      setUpiId(data.upi_id || '');
      setUsdtAddress(data.usdt_address || '');
      setUsdtNetwork(data.usdt_network || 'TRC20');
      setQrCodeUrl(data.qr_code_url || '');
    }
  };

  const fetchUserData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('price_per_member, price_per_foreign_member, price_per_dp_member')
      .eq('id', user?.id)
      .maybeSingle();

    if (!error && data) {
      const rate = data.price_per_member || 0;
      const foreignRate = data.price_per_foreign_member || data.price_per_member || 0;
      const dpRate = data.price_per_dp_member || 240;
      setPricePerMember(rate);
      setPricePerForeignMember(foreignRate);
      setPricePerDpMember(dpRate);
      return rate;
    }
    return 0;
  };

  const calculateDailyNetDue = (meetingsData: Meeting[], rate: number, dateStr: string) => {
    const targetDate = new Date(dateStr).toDateString();
    const targetMeetings = meetingsData.filter(m => {
      const meetingDate = new Date(m.created_at).toDateString();
      return meetingDate === targetDate && m.status !== 'not_live' && m.screenshot_url && m.screenshot_url.trim() !== '';
    });

    // Calculate dues using appropriate rates for each meeting type
    const netDue = targetMeetings.reduce((sum, m) => {
      const members = m.member_count || 0;
      const rateToUse = m.member_type === 'dp' ? pricePerDpMember : rate;
      return sum + (members * rateToUse);
    }, 0);

    setDailyNetDue(netDue);
  };

  const deleteMeeting = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);

    if (meeting?.screenshot_url && meeting.screenshot_url !== '') {
      alert('Cannot delete meeting with screenshot. Please contact admin.');
      return;
    }

    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (error) {
      alert('Failed to delete meeting: ' + error.message);
      fetchMeetings();
    } else {
      setMeetings(prev => prev.filter(m => m.id !== meetingId));

      if (meeting?.scheduled_date && meeting?.client_name) {
        await supabase.rpc('calculate_daily_dues_for_client', {
          p_client_name: meeting.client_name,
          p_date: meeting.scheduled_date
        });
      }

      fetchMeetings();
    }
  };

  const handlePaymentUpload = async () => {
    if (!paymentScreenshot) {
      alert('Please select a payment screenshot');
      return;
    }

    if (!paymentUptoDate) {
      alert('Please select payment upto date');
      return;
    }

    const paymentAmount = dailyDues
      .filter(due => due.date <= paymentUptoDate)
      .reduce((sum, due) => sum + Number(due.amount), 0);

    if (paymentAmount <= 0) {
      alert('No dues to pay upto the selected date');
      return;
    }

    const existingPendingPayments = myPayments.filter(p => p.status === 'pending').length;
    if (existingPendingPayments > 0) {
      const confirmAdd = window.confirm(
        `You have ${existingPendingPayments} pending payment screenshot(s) already uploaded. Do you want to add another screenshot?`
      );
      if (!confirmAdd) return;
    }

    try {
      const fileExt = paymentScreenshot.name.split('.').pop();
      const fileName = `payment-${user?.id}-${Date.now()}.${fileExt}`;
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
          client_id: user?.id,
          client_name: user?.name,
          amount: paymentAmount,
          screenshot_url: publicUrl,
          payment_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      await supabase
        .from('notifications')
        .insert({
          user_id: null,
          message: `New payment received from ${user?.name} for ₹${paymentAmount}`,
          type: 'info'
        });

      alert('Payment screenshot uploaded successfully! Waiting for admin approval.');
      setPaymentScreenshot(null);
      setPaymentUptoDate('');
      await fetchMyPayments();
      await fetchDailyDues();
    } catch (error: any) {
      alert('Error uploading payment: ' + error.message);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this payment screenshot?');
    if (!confirmDelete) return;

    setMyPayments(prev => prev.filter(p => p.id !== paymentId));

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      alert('Payment screenshot deleted successfully!');
    } catch (error: any) {
      alert('Error deleting payment: ' + error.message);
      await fetchMyPayments();
    }
  };

  const fetchPreviousMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('meeting_name, meeting_id, password, hour, minutes, time_period, member_count')
      .eq('client_name', user?.name)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      const uniqueMeetings = data.reduce((acc: Meeting[], curr) => {
        if (!acc.find(m =>
          m.meeting_id === curr.meeting_id &&
          m.password === curr.password
        )) {
          acc.push(curr as Meeting);
        }
        return acc;
      }, []);
      setPreviousMeetings(uniqueMeetings);
    }
  };

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    return () => clearTimeout(welcomeTimer);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) {
      setDateLabel('Today');
    } else {
      const date = new Date(selectedDate);
      setDateLabel(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
  }, [selectedDate]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'login_restricted')
        .maybeSingle();

      if (settingsData?.setting_value === 'true') {
        onLogout();
      }
    };

    checkLoginStatus();
    const statusInterval = setInterval(checkLoginStatus, 5000);

    const channel = supabase
      .channel('system_settings_client_check')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_settings',
          filter: 'setting_key=eq.login_restricted'
        },
        (payload: any) => {
          if (payload.new.setting_value === 'true') {
            onLogout();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(statusInterval);
      channel.unsubscribe();
    };
  }, [onLogout]);

  useEffect(() => {
    const loadData = async () => {
      const rate = await fetchUserData();
      await fetchMeetings(rate);
      await fetchPreviousMeetings();
      await fetchMyPayments();
      await fetchPaymentMethods();
      await fetchDailyDues();
      await fetchAdvanceBalance();
      await fetchDatabaseNotifications();
      await fetchRecurringMeetings();
    };
    loadData();

    const sessionId = localStorage.getItem('client_session_id');
    const updateActivity = async () => {
      if (sessionId) {
        await supabase
          .from('user_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', sessionId)
          .eq('is_active', true);
      }
    };

    updateActivity();
    const activityInterval = setInterval(updateActivity, 60000);

    const dataRefreshInterval = setInterval(() => {
      fetchMyPayments();
      fetchDailyDues();
      fetchAdvanceBalance();
    }, 3000);

    const paymentMethodsSub = supabase
      .channel('client_payment_methods_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, (payload) => {
        console.log('Client: Payment methods changed', payload);
        fetchPaymentMethods();
      })
      .subscribe();

    const advancePaymentsSub = supabase
      .channel('client_advance_payments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advance_payments' }, (payload) => {
        console.log('Client: Advance payments changed', payload);
        if (payload.new && payload.eventType === 'UPDATE') {
          setAdvanceBalance({
            amount: Number(payload.new.remaining_amount) || 0,
            members: Number(payload.new.remaining_members) || 0
          });
        } else {
          fetchAdvanceBalance();
        }
      })
      .subscribe();

    const notificationsSub = supabase
      .channel('client_notifications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` }, (payload) => {
        console.log('Client: Notification received', payload);
        fetchDatabaseNotifications();
        if (payload.eventType === 'INSERT' && !payload.new.is_read) {
          playNotificationSound();
        }
      })
      .subscribe();

    const paymentsSub = supabase
      .channel('client_payments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `client_id=eq.${user?.id}` }, (payload) => {
        console.log('Client: Payment status changed', payload);
        fetchMyPayments();
        fetchDailyDues();
        setTimeout(() => {
          fetchMyPayments();
          fetchDailyDues();
        }, 1000);
      })
      .subscribe();

    const dailyDuesSub = supabase
      .channel('client_daily_dues_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_dues', filter: `client_id=eq.${user?.id}` }, (payload) => {
        console.log('Client: Daily dues changed', payload);
        fetchDailyDues();
        setTimeout(() => {
          fetchDailyDues();
        }, 1000);
      })
      .subscribe();

    return () => {
      clearInterval(activityInterval);
      clearInterval(dataRefreshInterval);
      paymentMethodsSub.unsubscribe();
      advancePaymentsSub.unsubscribe();
      notificationsSub.unsubscribe();
      paymentsSub.unsubscribe();
      dailyDuesSub.unsubscribe();
    };
  }, [selectedDate]);

  useEffect(() => {
    const oldLoadData = async () => {
      const rate = await fetchUserData();
      await fetchMeetings(rate);
      await fetchPreviousMeetings();
      await fetchMyPayments();
      await fetchPaymentMethods();
    };
    oldLoadData();

    const subscription = supabase
      .channel(`client_meetings_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload: any) => {
        console.log('Client: Meeting change detected', payload);
        fetchMeetings();

        if (payload.eventType === 'UPDATE' && payload.new.screenshot_url && payload.new.client_name === user?.name) {
          setScreenshotNotification(payload.new.meeting_name);
          setTimeout(() => setScreenshotNotification(null), 5000);

          const newNotification = {
            id: `screenshot-${payload.new.id}-${Date.now()}`,
            message: `Screenshot uploaded for ${payload.new.meeting_name}`,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: 'screenshot' as const
          };
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
        }
      })
      .subscribe();

    const paymentMethodsSubscription = supabase
      .channel(`payment_methods_${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, (payload) => {
        console.log('Client: Payment methods changed', payload);
        fetchPaymentMethods();
      })
      .subscribe();

    const userRateSubscription = supabase
      .channel(`user_rate_${user?.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, async (payload: any) => {
        console.log('Client: Rate changed', payload);
        if (payload.new && payload.new.name === user?.name) {
          const newRate = payload.new.price_per_member;
          const newForeignRate = payload.new.price_per_foreign_member || payload.new.price_per_member;
          setPricePerMember(newRate);
          setPricePerForeignMember(newForeignRate);
          setPricePerDpMember(payload.new.price_per_dp_member || 240);
          await fetchMeetings(newRate);
          await fetchDailyDues();
        }
      })
      .subscribe();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.meeting-name-input')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      paymentMethodsSubscription.unsubscribe();
      userRateSubscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user?.name]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const istHours = now.getHours();
      const istMinutes = now.getMinutes();

      if (istHours === 0 && istMinutes === 0) {
        const newDate = now.toISOString().split('T')[0];
        setSelectedDate(newDate);
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  const filteredSuggestions = meetingName
    ? previousMeetings.filter(m =>
        m.meeting_name.toLowerCase().includes(meetingName.toLowerCase())
      )
    : previousMeetings.slice(0, 10);

  const selectSuggestion = (meeting: Meeting) => {
    setMeetingName(meeting.meeting_name);
    setMeetingId(meeting.meeting_id);
    setPassword(meeting.password);
    setHour(meeting.hour || 8);
    setMinutes(meeting.minutes || 0);
    setTimePeriod(meeting.time_period || 'PM');
    setMemberCount(meeting.member_count || 1);
    setShowSuggestions(false);
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.metadata?.screenshot_url) {
      setSelectedScreenshot(notification.metadata.screenshot_url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetingName.trim() || !meetingId.trim() || !password.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const cleanMeetingId = meetingId.replace(/\s/g, '');
    const cleanPassword = password.replace(/\s/g, '');

    const targetDate = scheduledDate || selectedDate;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingMeetings, error: checkError } = await supabase
      .from('meetings')
      .select('id, meeting_id, meeting_name, hour, minutes, time_period')
      .eq('client_name', user?.name)
      .eq('meeting_id', cleanMeetingId)
      .or(`and(scheduled_date.gte.${targetDate},scheduled_date.lte.${targetDate}),and(scheduled_date.is.null,created_at.gte.${startOfDay.toISOString()},created_at.lte.${endOfDay.toISOString()})`);

    if (checkError) {
      console.error('Error checking duplicates:', checkError);
    }

    if (existingMeetings && existingMeetings.length > 0) {
      const newTime = `${hour}:${String(minutes).padStart(2, '0')} ${timePeriod}`;

      const duplicateWithSameTime = existingMeetings.find(existing => {
        const existingTime = `${existing.hour}:${String(existing.minutes).padStart(2, '0')} ${existing.time_period}`;
        return existingTime === newTime;
      });

      if (duplicateWithSameTime) {
        const existingTime = `${duplicateWithSameTime.hour}:${String(duplicateWithSameTime.minutes).padStart(2, '0')} ${duplicateWithSameTime.time_period}`;
        const message = `⚠️ Meeting Already Added!\n\nMeeting ID: ${cleanMeetingId}\nMeeting Name: ${duplicateWithSameTime.meeting_name}\n\nThis meeting is already added for ${scheduledDate ? new Date(scheduledDate).toLocaleDateString('en-IN') : 'today'} at ${existingTime}.\n\nSame meeting at different times is allowed, but this exact meeting at this exact time already exists.`;

        alert(message);
        return;
      }
    }

    const meetingData: any = {
      meeting_name: meetingName,
      meeting_id: cleanMeetingId,
      password: cleanPassword,
      hour: hour,
      minutes: minutes,
      time_period: timePeriod,
      member_count: memberCount,
      member_type: memberType,
      client_id: user?.id,
      client_name: user?.name,
      is_instant: isInstant,
      attended: false
    };

    if (scheduledDate) {
      meetingData.scheduled_date = scheduledDate;
    }

    const { error } = await supabase
      .from('meetings')
      .insert([meetingData]);

    if (error) {
      alert('Error saving meeting: ' + error.message);
      return;
    }

    if (scheduledDate) {
      alert(`✅ Meeting scheduled successfully for ${new Date(scheduledDate).toLocaleDateString('en-IN')}!`);
    } else {
      alert('✅ Meeting added successfully!');
    }

    setMeetingName('');
    setMeetingId('');
    setPassword('');
    setHour(8);
    setMinutes(15);
    setTimePeriod('PM');
    setMemberCount(1);
    setMemberType('indian');
    setIsInstant(false);
    setScheduledDate('');
    fetchMeetings();
    fetchPreviousMeetings();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {screenshotNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 rounded-xl shadow-2xl px-6 py-3 border border-green-500/50">
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Screenshot uploaded of {screenshotNotification}
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-[1800px] py-4 md:py-6 px-4 md:px-6 lg:px-8">
        <div className={`rounded-3xl shadow-2xl p-6 md:p-8 mb-6 border backdrop-blur-xl transition-all duration-500 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50'
            : 'bg-white/80 border-gray-200/50'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  isDark ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  <span className="text-white text-xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user?.name || 'Client'}
                  </h1>
                  <p className={`text-xs md:text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Client Dashboard
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl w-fit ${
                isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
              }`}>
                <Calendar size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                <span className={`font-semibold text-sm ${
                  isDark ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const { data: lastPayment } = await supabase
                      .from('payments')
                      .select('payment_date')
                      .eq('client_name', user?.name)
                      .eq('status', 'approved')
                      .order('payment_date', { ascending: false })
                      .limit(1)
                      .maybeSingle();

                    let fromDate: string;
                    if (lastPayment?.payment_date) {
                      const nextDay = new Date(lastPayment.payment_date);
                      nextDay.setDate(nextDay.getDate() + 1);
                      fromDate = nextDay.toISOString().split('T')[0];
                    } else {
                      const { data: firstMeeting } = await supabase
                        .from('meetings')
                        .select('scheduled_date')
                        .eq('client_name', user?.name)
                        .order('scheduled_date', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                      fromDate = firstMeeting?.scheduled_date || '2024-01-01';
                    }

                    const toDate = new Date().toISOString().split('T')[0];

                    const { data: meetingsData, error: meetingsError } = await supabase
                      .from('meetings')
                      .select('*')
                      .eq('client_name', user?.name)
                      .gte('scheduled_date', fromDate)
                      .lte('scheduled_date', toDate)
                      .order('scheduled_date', { ascending: true });

                    if (meetingsError) throw meetingsError;

                    const validMeetings = meetingsData || [];

                    if (validMeetings.length === 0) {
                      alert('No meetings found since last payment.');
                      return;
                    }

                    const meetings = validMeetings.map(m => {
                      const rate = m.member_type === 'dp' ? pricePerDpMember : pricePerMember;
                      const amount = (m.member_count || 0) * rate;
                      return {
                        date: m.scheduled_date || m.created_at,
                        meetingName: m.meeting_name,
                        members: m.member_count || 0,
                        memberType: m.member_type || 'indian',
                        rate: rate,
                        amount: amount
                      };
                    });

                    const subtotal = meetings.reduce((sum, m) => sum + m.amount, 0);

                    const { generateClientInvoicePDF } = await import('../utils/pdfGenerator');
                    generateClientInvoicePDF({
                      invoiceNumber: Math.floor(Math.random() * 10000),
                      clientName: user?.name,
                      fromDate,
                      toDate,
                      invoiceDate: new Date().toISOString(),
                      meetings,
                      adjustments: [],
                      totalMeetings: meetings.length,
                      totalMembers: meetings.reduce((sum, m) => sum + m.members, 0),
                      subtotal,
                      adjustmentTotal: 0,
                      netAmount: subtotal,
                      lastPaymentDate: lastPayment?.payment_date
                    });
                  } catch (error) {
                    console.error('Error generating invoice:', error);
                    alert('Failed to generate invoice. Please try again.');
                  }
                }}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Download Invoice"
              >
                <FileText size={20} className={isDark ? 'text-gray-300' : 'text-gray-700'} />
              </button>
              <button
                onClick={async () => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    await supabase
                      .from('notifications')
                      .update({ is_read: true })
                      .eq('user_id', user?.id)
                      .eq('is_read', false);

                    setNotifications(prev => prev.map(n => ({...n, read: true})));
                    setUnreadCount(0);
                  }
                }}
                className={`relative p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center animate-bounce shadow-lg border-2 border-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={goToPreviousDate}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Previous Day"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                onClick={() => setShowCalendar(true)}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="View Calendar"
              >
                <Calendar size={20} className={isDark ? 'text-gray-300' : 'text-gray-700'} />
              </button>
              {!isToday() && (
                <button
                  onClick={goToNextDate}
                  className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                    isDark
                      ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                  title="Next Day"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              )}
              <button
                onClick={toggleTheme}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-700" />}
              </button>
              <button
                onClick={async () => {
                  const newPassword = prompt('Enter new password (min 6 characters):');
                  if (newPassword && newPassword.length >= 6) {
                    await supabase
                      .from('users')
                      .update({ password_hash: newPassword })
                      .eq('id', user?.id);
                    alert('Password changed successfully!');
                  } else if (newPassword) {
                    alert('Password must be at least 6 characters');
                  }
                }}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Change Password"
              >
                <Key size={20} className={isDark ? 'text-gray-300' : 'text-gray-700'} />
              </button>
              {(() => {
                const adminBackup = localStorage.getItem('admin_user_backup');
                if (adminBackup) {
                  try {
                    const adminUser = JSON.parse(adminBackup);
                    if (adminUser.role === 'admin') {
                      return (
                        <button
                          onClick={() => {
                            localStorage.setItem('user', adminBackup);
                            localStorage.removeItem('admin_user_backup');
                            window.location.reload();
                          }}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 backdrop-blur-md p-3 rounded-xl transition-all duration-300 border border-emerald-400/30 hover:border-emerald-400/50 shadow-lg hover:-translate-x-1 hover:scale-110"
                          title="Back to Admin Panel"
                        >
                          <ArrowLeft size={20} className="text-emerald-300" />
                        </button>
                      );
                    }
                  } catch (e) {
                    localStorage.removeItem('admin_user_backup');
                  }
                }
                return null;
              })()}
              <button
                onClick={() => {
                  fetchDailyDues();
                  fetchMyPayments();
                  fetchAdvancePayments();
                }}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                title="Refresh Data"
              >
                <RefreshCw size={20} className="text-white" />
              </button>
              <button
                onClick={onLogout}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            className="bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 rounded-2xl shadow-2xl p-5 hover:shadow-[0_25px_50px_-12px_rgba(234,88,12,0.5)] transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            onMouseEnter={() => playMoneyCountingSound()}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <p className="text-sm text-orange-100 font-semibold">Net Due Today</p>
                <button
                  onClick={() => setShowDueAmount(!showDueAmount)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-lg transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                  title={showDueAmount ? 'Hide Amount' : 'Show Amount'}
                >
                  {showDueAmount ? (
                    <Eye size={16} className="text-white" />
                  ) : (
                    <EyeOff size={16} className="text-white" />
                  )}
                </button>
              </div>
              <p className="text-4xl font-black text-white">{showDueAmount ? `₹${dailyNetDue.toFixed(2)}` : '₹•••••'}</p>
              <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-lg">
                <p className="text-xs text-white font-bold">
                  ₹{pricePerMember.toFixed(2)} per member
                </p>
              </div>
              <p className="text-xs text-orange-100 mt-2">Only today's dues</p>
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl shadow-2xl p-5 hover:shadow-[0_25px_50px_-12px_rgba(220,38,38,0.5)] transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            onMouseEnter={() => playMoneyCountingSound()}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <p className="text-sm text-red-100 font-semibold">Net Due Till Today</p>
                <button
                  onClick={() => setShowDueAmount(!showDueAmount)}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-lg transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                  title={showDueAmount ? 'Hide Amount' : 'Show Amount'}
                >
                  {showDueAmount ? (
                    <Eye size={16} className="text-white" />
                  ) : (
                    <EyeOff size={16} className="text-white" />
                  )}
                </button>
              </div>
              <p className="text-4xl font-black text-white">{showDueAmount ? `₹${totalNetDue.toFixed(2)}` : '₹•••••'}</p>
              <div className="mt-2 bg-green-400/90 backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-lg">
                <p className="text-xs text-gray-900 font-bold italic">
                  ₹{pricePerMember.toFixed(2)} per member
                </p>
              </div>
              <p className="text-xs text-red-100 mt-2">Accumulated dues</p>
              {paymentSettledTill && (
                <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                  <p className="text-xs text-white font-semibold">
                    💚 Paid Till: {new Date(paymentSettledTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {advanceBalance.amount > 0 && (
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-6 mb-6 border-4 border-green-400">
            <div className="text-center">
              <p className="text-2xl text-white font-black mb-3 flex items-center justify-center gap-2">
                <span className="text-3xl">💰</span>
                Advance Left
              </p>
              <div className="flex items-center justify-center gap-3 mb-3">
                <span className="text-5xl font-black text-white drop-shadow-lg">
                  ₹{advanceBalance.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 inline-block">
                <span className="text-lg text-white font-bold">
                  {advanceBalance.members} members equivalent
                </span>
              </div>
              <p className="text-sm text-white/95 mt-3 font-semibold">
                ✓ Your dues are automatically deducted from this advance
              </p>
              <p className="text-xs text-white/80 mt-1">
                Net due will remain ₹0 until advance is exhausted
              </p>
            </div>
          </div>
        )}

        {dailyDues.length > 0 && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 rounded-2xl shadow-xl p-4 mb-6">
            <>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {showBreakdown ? '▲ Hide' : '▼ Show'} Date-wise Breakdown ({dailyDues.length} dates)
              </button>
              {showBreakdown && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 max-h-64 overflow-y-auto mt-3">
                  <div className="space-y-1.5">
                    {dailyDues.map((due) => {
                      const hasAdvanceAdjustment = due.advance_adjustment && Number(due.advance_adjustment) > 0;
                      const originalAmount = Number(due.original_amount || due.amount);
                      const advanceUsed = Number(due.advance_adjustment || 0);
                      const finalAmount = Number(due.amount || 0);

                      return (
                        <button
                          key={due.id}
                          onClick={() => {
                            setSelectedDate(due.date);
                            setSelectedDueDate(due.date);
                            setShowMeetingBreakdown(true);
                            setTimeout(() => {
                              breakdownSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }}
                          className="w-full text-left px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-white group"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{new Date(due.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                              <span className="text-white/70 text-xs">{due.meeting_count} mtg{due.meeting_count > 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-right">
                              {hasAdvanceAdjustment ? (
                                <div>
                                  <div className="text-xs text-white/60">₹{Math.round(originalAmount)} - ₹{Math.round(advanceUsed)}</div>
                                  <div className="font-bold text-yellow-300">{finalAmount > 0 ? `₹${Math.round(finalAmount)}` : '✓ Paid'}</div>
                                </div>
                              ) : (
                                <div className="font-bold text-lg text-yellow-300">₹{Math.round(finalAmount)}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className={`rounded-2xl shadow-2xl p-4 md:p-6 transition-all duration-500 ${
            isDark
              ? 'bg-gradient-to-br from-gray-800 via-slate-800 to-gray-800 border border-gray-700/50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
              : 'bg-gradient-to-br from-white via-gray-50 to-white border border-gray-200/50 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] hover:border-blue-200'
          }`}>
            <h2 className={`text-xl md:text-2xl font-bold mb-4 md:mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Add New Meeting
            </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClassName}>
                Meeting Name *
              </label>
              <div className="relative meeting-name-input">
                <input
                  type="text"
                  value={meetingName}
                  onChange={(e) => {
                    setMeetingName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className={inputClassName}
                  placeholder="e.g., Team Standup (Start typing or click to see previous meetings)"
                  required
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 border-2 rounded-xl shadow-2xl max-h-64 overflow-y-auto ${
                    isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-slate-300'
                  }`}>
                    <div className={`sticky top-0 px-4 py-2 border-b-2 ${
                      isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                      <p className="text-xs font-bold">Previous Meetings - Click to use</p>
                    </div>
                    {filteredSuggestions.map((meeting, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestion(meeting)}
                        className={`w-full text-left px-4 py-3 transition-all duration-200 border-b last:border-b-0 hover:shadow-md ${
                          isDark ? 'hover:bg-gray-700 border-gray-700 text-white' : 'hover:bg-slate-100 border-gray-200'
                        }`}
                      >
                        <div className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{meeting.meeting_name}</div>
                        <div className={`flex flex-wrap gap-2 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">ID: {meeting.meeting_id}</span>
                          <span className="bg-blue-100 px-2 py-0.5 rounded">{meeting.hour || 8}:{String(meeting.minutes || 0).padStart(2, '0')} {meeting.time_period || 'PM'}</span>
                          <span className="bg-green-100 px-2 py-0.5 rounded">{meeting.member_count || 1} members</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>
                  Meeting ID *
                </label>
                <input
                  type="text"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value.replace(/\s/g, ''))}
                  className={inputClassName}
                  placeholder="1234567890"
                  required
                />
              </div>

              <div>
                <label className={labelClassName}>
                  Password *
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Password"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClassName}>
                Time
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className={isDark ? 'px-3 py-2.5 rounded-xl border-2 bg-gray-900 border-gray-500 text-white focus:border-blue-400 outline-none transition-all duration-300 shadow-lg' : 'px-3 py-2.5 rounded-xl border bg-white border-gray-300 text-gray-900 focus:border-slate-500 outline-none transition-all duration-300'}
                >
                  {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className={isDark ? 'px-3 py-2.5 rounded-xl border-2 bg-gray-900 border-gray-500 text-white focus:border-blue-400 outline-none transition-all duration-300 shadow-lg' : 'px-3 py-2.5 rounded-xl border bg-white border-gray-300 text-gray-900 focus:border-slate-500 outline-none transition-all duration-300'}
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>00</option>
                </select>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTimePeriod('AM')}
                    className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                      timePeriod === 'AM'
                        ? isDark ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400' : 'bg-slate-800 text-white shadow-lg'
                        : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePeriod('PM')}
                    className={`flex-1 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                      timePeriod === 'PM'
                        ? isDark ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400' : 'bg-slate-800 text-white shadow-lg'
                        : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Members
              </label>
              <input
                type="number"
                min="1"
                value={memberCount}
                onChange={(e) => setMemberCount(Number(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
                className={inputClassName}
                placeholder="1"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Member Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMemberType('indian')}
                  className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    memberType === 'indian'
                      ? 'bg-green-600 text-white shadow-lg border-2 border-green-400'
                      : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🇮🇳 Indian
                </button>
                <button
                  type="button"
                  onClick={() => setMemberType('foreigners')}
                  className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${
                    memberType === 'foreigners'
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400'
                      : isDark ? 'bg-gray-900 text-gray-300 hover:bg-gray-700 border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🌍 Foreigners
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="instant"
                checked={isInstant}
                onChange={(e) => setIsInstant(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-slate-500"
              />
              <label htmlFor="instant" className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Mark as Instant Meeting
              </label>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Schedule for Future Date (Optional)
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={inputClassName}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to add to today's meetings
              </p>
            </div>

            <button
              type="submit"
              className={`w-full font-bold py-3 px-4 text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 ${
                isDark
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-2 border-blue-400'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              <Plus size={16} />
              Add Meeting
            </button>
          </form>

          {recurringMeetings.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowRecurringList(!showRecurringList)}
                className={`w-full px-4 py-2 rounded-xl font-semibold transition-all flex items-center justify-between ${
                  isDark
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <span>⏰ Daily Recurring Meetings ({recurringMeetings.length})</span>
                <span>{showRecurringList ? '▲' : '▼'}</span>
              </button>

              {showRecurringList && (
                <div className="mt-3 space-y-2">
                  {recurringMeetings.map(rm => (
                    <div key={rm.id} className={`p-3 rounded-lg border-2 ${
                      isDark
                        ? 'bg-gray-800 border-green-700'
                        : 'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{rm.meeting_name}</div>
                          <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span>🕐 {rm.hour}:{String(rm.minutes).padStart(2, '0')} {rm.time_period}</span>
                            <span className="mx-2">•</span>
                            <span>👥 {rm.member_count} {rm.member_type}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromDailyList(rm.id)}
                          className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>

          {meetings.length > 0 && (
            <div className={`rounded-2xl shadow-2xl p-4 md:p-6 border transition-all duration-500 lg:row-span-2 ${
              isDark
                ? 'bg-gradient-to-br from-gray-800 via-slate-800 to-gray-800 border-gray-700/50'
                : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200/50'
            }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
              <h2 className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                My Meetings - {dateLabel}
                <span className="ml-2 text-lg font-normal text-gray-500">
                  ({getFilteredMeetings().length})
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="px-3 py-2 text-sm border-2 border-blue-300 rounded-xl bg-white hover:bg-blue-50 transition-all font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">🕐 All Times</option>
                  <option value="morning">🌅 Morning (6AM-12PM)</option>
                  <option value="afternoon">☀️ Afternoon (12PM-5PM)</option>
                  <option value="evening">🌆 Evening (5PM-9PM)</option>
                  <option value="night">🌙 Night (9PM-6AM)</option>
                </select>

                <button
                  onClick={handleOpenAll}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open All
                </button>
              </div>
            </div>

            {(() => {
              const dateAdjustments = adjustments.filter(adj => adj.date === selectedDate);
              const dailyDue = dailyDues.find(d => d.date === selectedDate);
              const attendedMeetingsWithScreenshots = meetings.filter(m => m.attended && m.screenshot_url);

              if (attendedMeetingsWithScreenshots.length > 0 || dateAdjustments.length > 0) {
                return (
                  <div ref={breakdownSectionRef} className="mb-4">
                    <div className={`border-2 rounded-xl p-4 shadow-md ${
                      isDark
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
                        : 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200'
                    }`}>
                        <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <span className={isDark ? 'text-teal-400' : 'text-teal-600'}>₹</span>
                          Detailed Breakdown
                        </h3>

                        {attendedMeetingsWithScreenshots.length > 0 && (() => {
                          const totalMembers = attendedMeetingsWithScreenshots.reduce((sum, m) => sum + (m.member_count || 0), 0);
                          const totalAmount = attendedMeetingsWithScreenshots.reduce((sum, m) => {
                            const rate = m.member_type === 'foreigners' ? pricePerForeignMember : pricePerMember;
                            return sum + ((m.member_count || 0) * rate);
                          }, 0);

                          return (
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between mb-3">
                                <p className={`text-sm font-bold ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>Meetings</p>
                                <div className={`px-3 py-1 rounded-lg ${isDark ? 'bg-teal-900/50' : 'bg-teal-100'}`}>
                                  <span className={`text-xs font-bold ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>
                                    {totalMembers} Total Members
                                  </span>
                                </div>
                              </div>
                              {attendedMeetingsWithScreenshots.map(meeting => {
                                const rate = meeting.member_type === 'foreigners' ? pricePerForeignMember : pricePerMember;
                                const amount = (meeting.member_count || 0) * rate;
                                return (
                                  <div key={meeting.id} className={`flex justify-between items-start p-3 rounded-xl shadow-sm transition-all hover:shadow-md ${
                                    isDark ? 'bg-slate-700/70 border border-slate-600' : 'bg-white/80 border border-teal-200'
                                  }`}>
                                    <div className="flex-1">
                                      <div className={`font-bold text-sm mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{meeting.meeting_name}</div>
                                      <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        <span className={`px-2 py-1 rounded-md font-semibold ${isDark ? 'bg-slate-600' : 'bg-teal-50'}`}>
                                          {meeting.member_count} {meeting.member_type === 'foreigners' ? 'Foreign' : 'Indian'}
                                        </span>
                                        <span>×</span>
                                        <span className="font-mono">₹{rate}</span>
                                        <span>=</span>
                                        <span className="font-bold">₹{Math.round(amount)}</span>
                                      </div>
                                    </div>
                                    <span className={`font-black text-lg ml-3 ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>₹{Math.round(amount)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {dateAdjustments.length > 0 && (
                          <div className={`border-t pt-2 mt-2 ${isDark ? 'border-slate-600' : 'border-teal-200'}`}>
                            <p className={`text-sm font-bold mb-3 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Additional Charges</p>
                            {dateAdjustments.map(adj => (
                              <div key={adj.id} className={`flex justify-between items-center p-3 rounded-xl mb-2 shadow-sm ${
                                isDark ? 'bg-slate-700/70 border border-amber-900/30' : 'bg-amber-50/50 border border-amber-200'
                              }`}>
                                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{adj.reason}</span>
                                <span className={`font-bold text-lg ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>+₹{Math.round(Number(adj.amount))}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={`border-t-2 pt-4 mt-4 ${isDark ? 'border-slate-600' : 'border-teal-300'}`}>
                          <div className={`flex justify-between items-center p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-teal-50'}`}>
                            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Total Due</span>
                            <span className={`text-2xl font-black ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                              ₹{dailyDue ? Math.round(Number(dailyDue.amount)) : '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] md:max-h-[500px] overflow-y-auto">
              {[...getFilteredMeetings()].sort((a, b) => {
                if (a.is_instant !== b.is_instant) {
                  return a.is_instant ? -1 : 1;
                }

                if (a.attended !== b.attended) {
                  return a.attended ? 1 : -1;
                }

                const memberCountA = a.member_count || 0;
                const memberCountB = b.member_count || 0;

                if (memberCountA !== memberCountB) {
                  return memberCountB - memberCountA;
                }

                const hourA = (a.hour || 0) + (a.time_period === 'PM' ? 12 : 0);
                const hourB = (b.hour || 0) + (b.time_period === 'PM' ? 12 : 0);

                if (hourA !== hourB) {
                  return hourB - hourA;
                }

                const minutesA = a.minutes || 0;
                const minutesB = b.minutes || 0;

                return minutesB - minutesA;
              }).map((meeting, index) => (
                <div
                  key={meeting.id}
                  className={`group relative transition-all duration-300 ${meeting.attended ? 'opacity-60' : ''} ${
                    meeting.is_instant && !meeting.attended && (!meeting.screenshot_url || meeting.screenshot_url === '') ? 'flame-box' : ''
                  }`}
                  style={{ perspective: '1000px' }}
                >
                  <div className={`absolute inset-0 rounded-xl blur-xl opacity-30 ${
                    meeting.is_instant
                      ? 'bg-gradient-to-br from-amber-400 to-red-400'
                      : isDark
                      ? 'bg-gradient-to-br from-slate-600 to-slate-800'
                      : 'bg-gradient-to-br from-gray-200 to-gray-300'
                  }`} style={{ transform: 'translateY(8px) scale(0.95)' }} />

                  <div className={`absolute inset-0 rounded-xl ${
                    meeting.is_instant
                      ? 'bg-gradient-to-br from-amber-300 to-orange-300'
                      : isDark
                      ? 'bg-gradient-to-br from-slate-600 to-slate-700'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200'
                  }`} style={{ transform: 'translateY(4px) scale(0.98)' }} />

                  <div
                    className="relative rounded-xl overflow-hidden transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2 shadow-lg"
                    style={{ transform: 'translateZ(0)' }}
                  >
                    <div className={`absolute inset-0 ${
                      meeting.is_instant
                        ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
                        : isDark
                        ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900'
                        : 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700'
                    }`} />

                  <div className={`relative p-5 ${isDark ? 'text-white' : 'text-white'}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {meeting.is_instant && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md text-xs font-bold animate-pulse">
                              INSTANT
                            </span>
                          )}
                          <h3 className="text-2xl font-bold truncate">
                            {meeting.meeting_name}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <div className="text-xs text-white/60 mb-1">Meeting ID</div>
                            <span className="font-mono text-sm font-semibold break-all">{meeting.meeting_id}</span>
                          </div>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <div className="text-xs text-white/60 mb-1">Password</div>
                            <span className="font-mono text-sm font-semibold">{meeting.password}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {meeting.hour !== undefined && meeting.time_period && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                              <Clock size={12} />
                              {meeting.hour}:{meeting.minutes === 60 ? '00' : String(meeting.minutes || 15).padStart(2, '0')}{meeting.time_period}
                            </span>
                          )}
                          {meeting.member_count !== undefined && meeting.member_count > 0 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/80 rounded-full text-xs font-bold">
                              <Users size={12} />
                              {meeting.member_count}
                            </span>
                          )}
                          {meeting.member_type && (
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                              {meeting.member_type === 'foreigners' ? '🌍 Foreigners' : '🇮🇳 Indian'}
                            </span>
                          )}
                          {meeting.status === 'not_live' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/80 rounded-full text-xs font-bold">
                              <AlertTriangle size={12} />
                              NOT LIVE
                            </span>
                          )}
                          {meeting.attended && (
                            <span className="px-3 py-1 bg-green-500/80 rounded-full text-xs font-bold">Attended</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {meeting.screenshot_url && (
                          <>
                            <button
                              onClick={() => setSelectedScreenshot(meeting.screenshot_url || null)}
                              className="px-3 py-1.5 bg-green-500/80 hover:bg-green-600 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleWhatsAppShare(meeting)}
                              className="px-3 py-1.5 bg-emerald-500/80 hover:bg-emerald-600 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                            >
                              Download
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      {meeting.status === 'not_live' ? (
                        <>
                          <span className="flex-1 text-center text-red-200 font-semibold">Meeting Not Live</span>
                          <button
                            onClick={() => deleteMeeting(meeting.id)}
                            className="px-4 py-2 bg-red-500/80 hover:bg-red-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </>
                      ) : meeting.attended ? (
                        <div className="flex-1 text-center py-2 bg-green-500/20 rounded-lg font-semibold">Meeting Completed</div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const randomName = getRandomHindiName();
                              const params = new URLSearchParams({
                                pwd: meeting.password,
                                uname: randomName
                              });
                              window.open(`https://zoom.us/wc/join/${meeting.meeting_id}?${params.toString()}`, '_blank', 'noopener,noreferrer');
                              return false;
                            }}
                            className="flex-1 bg-white hover:bg-gray-100 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 flame-button"
                          >
                            Join Meeting
                          </button>
                          {(!meeting.screenshot_url || meeting.screenshot_url === '') && (
                            <button
                              onClick={() => deleteMeeting(meeting.id)}
                              className="p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {totalNetDue > 0 && (
            <div ref={paymentSectionRef} className={`rounded-2xl shadow-2xl p-4 md:p-6 border ${isDark ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 border-gray-700/50' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50'}`}>
            <div className="flex flex-col md:flex-row items-start justify-between mb-4 gap-4">
              <div className="flex-1">
                <h2 className={`text-xl md:text-2xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <span className="text-2xl md:text-3xl text-green-600">₹</span>
                  Upload Payment Proof
                </h2>
              </div>

              <PaymentFormWizard
                userId={user?.id}
                userName={user?.name}
                dailyDues={dailyDues}
                totalNetDue={totalNetDue}
                onSuccess={() => {
                  fetchMyPayments();
                  fetchDailyDues();
                }}
              />
            </div>

            {myPayments.filter(p => p.status === 'pending' || p.status === 'approved').length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-base md:text-lg font-bold text-gray-900">
                  My Uploaded Payments
                </h3>
                {myPayments.filter(p => p.status === 'pending' || p.status === 'approved').map((payment) => (
                  <div
                    key={payment.id}
                    className={`rounded-xl p-3 md:p-4 border shadow-md transition-all duration-300 ${
                      payment.status === 'pending' ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300' :
                      payment.status === 'approved' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' :
                      'bg-gradient-to-r from-red-50 to-red-100 border-red-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-700">
                            {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            payment.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                            payment.status === 'approved' ? 'bg-green-200 text-green-800' :
                            'bg-red-200 text-red-800'
                          }`}>
                            {payment.status || 'pending'}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          ₹{payment.amount.toFixed(2)}
                        </p>
                        {payment.payment_upto_date && (
                          <p className="text-xs text-gray-600">
                            Upto: {new Date(payment.payment_upto_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {payment.status === 'rejected' && payment.rejected_amount && (
                          <p className="text-xs text-red-600 italic font-semibold mt-1 bg-red-100 px-2 py-1 rounded">
                            ❌ Payment not received: ₹{payment.rejected_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => setSelectedScreenshot(payment.screenshot_url)}
                          className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <ImageIcon size={14} />
                          View
                        </button>
                        {payment.status === 'pending' && (
                          <button
                            onClick={async () => {
                              if (confirm('Delete this payment?')) {
                                const { error } = await supabase
                                  .from('payments')
                                  .delete()
                                  .eq('id', payment.id);
                                if (!error) {
                                  await fetchMyPayments();
                                  await fetchDailyDues();
                                  alert('Payment deleted!');
                                }
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 md:py-2 rounded-lg transition-all text-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
          )}
        </div>

        {selectedScreenshot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-4xl w-full p-4 md:p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Meeting Screenshot
              </h3>
              <img
                src={selectedScreenshot}
                alt="Meeting screenshot"
                className="w-full rounded-xl border-2 border-gray-200"
              />
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl transition-all"
              >
                Close
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

      {showCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>📅 Select Date</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose a date to view meetings and payment details for that day
            </p>

            <div className="mb-6">
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Pick a Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setShowCalendar(false);
                }}
                className={`w-full px-5 py-4 rounded-xl border-2 focus:ring-2 outline-none transition-all text-xl font-semibold ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400 focus:ring-blue-500/50'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-200'
                }`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setSelectedDate(today);
                  setShowCalendar(false);
                }}
                className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                📍 Today
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className={`flex-1 font-bold py-3 px-4 rounded-xl transition-all ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed top-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[600px] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-white hover:bg-white/20 p-1 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p className="font-semibold">No notifications yet</p>
                <p className="text-sm mt-1">You'll be notified when screenshots are uploaded</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.type === 'payment') {
                        setShowNotifications(false);
                        setTimeout(() => {
                          paymentSectionRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                          });
                        }, 100);
                      }
                    }}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${
                      notification.type === 'payment' ? 'cursor-pointer' : ''
                    } ${
                      !notification.read
                        ? notification.type === 'payment'
                          ? 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 animate-pulse'
                          : 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notification.type === 'screenshot'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : notification.type === 'payment'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {notification.type === 'screenshot' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                            <circle cx="9" cy="9" r="2"></circle>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                          </svg>
                        ) : notification.type === 'payment' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${
                          notification.type === 'payment' && !notification.read
                            ? 'text-orange-700 dark:text-orange-300 text-base'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {notification.time}
                        </p>
                        {notification.type === 'payment' && !notification.read && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-bold mt-1">
                            Click to view payment section →
                          </p>
                        )}
                      </div>
                      {!notification.read && (
                        <div className={`w-2 h-2 rounded-full ${
                          notification.type === 'payment' ? 'bg-orange-600' : 'bg-blue-600'
                        }`}></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={async () => {
                  if (confirm('Clear all notifications?')) {
                    await supabase
                      .from('notifications')
                      .delete()
                      .eq('user_id', user?.id);

                    setNotifications([]);
                    setUnreadCount(0);
                  }
                }}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Sound Control Button */}
      <button
        onClick={() => setShowSoundControls(!showSoundControls)}
        className="fixed bottom-8 left-8 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-5 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:shadow-[0_0_60px_rgba(59,130,246,0.8)] transition-all duration-300 hover:scale-110 z-40"
        title="Sound Controls"
      >
        {soundMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z"></path>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5z"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        )}
      </button>

      {/* Sound Control Panel */}
      {showSoundControls && (
        <div className="fixed bottom-28 left-8 bg-white dark:bg-gray-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.3)] border-2 border-gray-200 dark:border-gray-700 p-6 w-80 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Sound Settings</h3>
            <button
              onClick={() => setShowSoundControls(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105 ${
                soundMuted
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {soundMuted ? '🔇 Unmute Sounds' : '🔊 Mute Sounds'}
            </button>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Volume</label>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={soundVolume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setSoundVolume(newVolume);
                  if (!soundMuted) {
                    playNotificationSound();
                  }
                }}
                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <button
              onClick={() => {
                if (!soundMuted) {
                  playNotificationSound();
                }
              }}
              disabled={soundMuted}
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105"
            >
              🔔 Test Sound
            </button>
          </div>
        </div>
      )}

      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[90vh]">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-12 right-0 bg-white hover:bg-gray-100 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all"
            >
              Close
            </button>
            <img
              src={selectedScreenshot}
              alt="Screenshot"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
