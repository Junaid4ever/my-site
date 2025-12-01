import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Video, Check, Square, Trash2, Users, Clock, Zap, Image as ImageIcon, UserCog, LogOut, Calendar, FileText, Moon, Sun, CheckCircle, Eye, Settings, EyeOff, AlertTriangle, List, X, Plus, IndianRupee, Shield, Bell } from 'lucide-react';
import { joinZoomMeeting } from '../utils/zoomHelper';
import { getRandomHindiName } from '../utils/indianNameGenerator';
import { UserManagement } from './UserManagement';
import { PaymentReceiving } from './PaymentReceiving';
import { CalendarView } from './CalendarView';
import { LicenseManagement } from './LicenseManagement';
import { AdvancePaymentManagement } from './AdvancePaymentManagement';
import { DueAdjustmentPanel } from './DueAdjustmentPanel';
import { ClientsOverview } from './ClientsOverview';
import { generateInvoicePDF } from '../utils/pdfGenerator';
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
  client_name?: string;
  is_instant: boolean;
  screenshot_url?: string;
  attended: boolean;
  status?: 'active' | 'not_live' | 'cancelled';
  created_at: string;
  alreadyAddedToday?: boolean;
}

interface Payment {
  id: string;
  client_id: string;
  amount: number;
  screenshot_url: string;
  payment_date: string;
  payment_upto_date?: string;
  status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  rejected_amount?: number;
  created_at: string;
  client_name?: string;
}

interface AdminPanelProps {
  onLogout?: () => void;
}

export function AdminPanel({ onLogout }: AdminPanelProps = {}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [highlightedMeetingId, setHighlightedMeetingId] = useState<string | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPreviousMeetings, setShowPreviousMeetings] = useState(false);
  const [showClientsOverview, setShowClientsOverview] = useState(false);
  const [previousMeetings, setPreviousMeetings] = useState<Meeting[]>([]);
  const { isDark, toggleTheme } = useTheme();
  const [totalIncomeToday, setTotalIncomeToday] = useState(0);
  const [totalIncomeTillToday, setTotalIncomeTillToday] = useState(0);
  const [estimatedIncomeToday, setEstimatedIncomeToday] = useState(0);
  const [showEstimatedIncome, setShowEstimatedIncome] = useState(false);
  const [novemberTotalEarnings, setNovemberTotalEarnings] = useState(0);
  const [clientIncomeBreakdown, setClientIncomeBreakdown] = useState<{clientName: string; income: number; members: number; rate: number; adjustments?: number; total?: number}[]>([]);
  const [showIncomeBreakdown, setShowIncomeBreakdown] = useState(false);
  const [showIncomeAmount, setShowIncomeAmount] = useState(false);
  const [clientDuesTillToday, setClientDuesTillToday] = useState<{clientName: string; totalDue: number}[]>([]);
  const [showDuesBreakdown, setShowDuesBreakdown] = useState(false);
  const [moneySoundPlayed, setMoneySoundPlayed] = useState(false);
  const [selectedMeetingForScreenshot, setSelectedMeetingForScreenshot] = useState<string | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPayments, setShowPayments] = useState(false);
  const [showPaymentReceiving, setShowPaymentReceiving] = useState(false);
  const [unreadPaymentCount, setUnreadPaymentCount] = useState(0);
  const [showLicenseManagement, setShowLicenseManagement] = useState(false);
  const [showAdvancePayments, setShowAdvancePayments] = useState(false);
  const [showDueAdjustment, setShowDueAdjustment] = useState(false);
  const [showOpenMeetingsDropdown, setShowOpenMeetingsDropdown] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiQrFile, setUpiQrFile] = useState<File | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [trc20Address, setTrc20Address] = useState('');
  const [trc20QrFile, setTrc20QrFile] = useState<File | null>(null);
  const [trc20QrUrl, setTrc20QrUrl] = useState('');
  const [bep20Address, setBep20Address] = useState('');
  const [bep20QrFile, setBep20QrFile] = useState<File | null>(null);
  const [bep20QrUrl, setBep20QrUrl] = useState('');
  const [isPaymentSettingsLocked, setIsPaymentSettingsLocked] = useState(false);
  const [isEditingPaymentSettings, setIsEditingPaymentSettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);
  const [rejectionAmount, setRejectionAmount] = useState('');
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState<'DP Member' | 'Webinar Member'>('DP Member');
  const [adjustmentClientId, setAdjustmentClientId] = useState('');
  const [adjustmentClientName, setAdjustmentClientName] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [allUsers, setAllUsers] = useState<{id: string; name: string}[]>([]);
  const [notifications, setNotifications] = useState<{id: string; clientName: string; meetingName: string; memberCount: number; time: string; read: boolean}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedClientForInvoice, setSelectedClientForInvoice] = useState<{id: string; name: string} | null>(null);
  const [selectedClientsForInvoice, setSelectedClientsForInvoice] = useState<string[]>([]);
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingBulkInvoices, setIsGeneratingBulkInvoices] = useState(false);
  const [useAutoDateCalculation, setUseAutoDateCalculation] = useState(true);
  const [searchMeetingId, setSearchMeetingId] = useState('');
  const [searchResults, setSearchResults] = useState<Meeting[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [hoveredUploadBox, setHoveredUploadBox] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [soundVolume, setSoundVolume] = useState(1.0);
  const [showSoundControls, setShowSoundControls] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [newlyAddedMeetingIds, setNewlyAddedMeetingIds] = useState<Set<string>>(new Set());
  const [cachedUsers, setCachedUsers] = useState<any[]>([]);
  const [meetingsCache, setMeetingsCache] = useState<{[key: string]: any[]}>({});
  const [adjustmentsCache, setAdjustmentsCache] = useState<{[key: string]: any[]}>({});
  const [incomeCache, setIncomeCache] = useState<{[key: string]: {total: number; breakdown: any[]}}>({});
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState<{[key: string]: number}>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAddManualIncome, setShowAddManualIncome] = useState(false);
  const [manualIncomeAmount, setManualIncomeAmount] = useState('');
  const [manualIncomeDescription, setManualIncomeDescription] = useState('');
  const [manualIncomeDate, setManualIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualIncomeEntries, setManualIncomeEntries] = useState<{id: string; date: string; amount: number; description: string; created_at: string}[]>([]);
  const [editingManualIncome, setEditingManualIncome] = useState<string | null>(null);
  const [editManualAmount, setEditManualAmount] = useState('');
  const [editManualDescription, setEditManualDescription] = useState('');
  const [showReplicateModal, setShowReplicateModal] = useState(false);
  const [yesterdayMeetings, setYesterdayMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingsToReplicate, setSelectedMeetingsToReplicate] = useState<Set<string>>(new Set());
  const [isLoadingYesterdayMeetings, setIsLoadingYesterdayMeetings] = useState(false);
  const [replicateDate, setReplicateDate] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [showCustomEntryModal, setShowCustomEntryModal] = useState(false);
  const [customEntryClient, setCustomEntryClient] = useState('');
  const [customEntryMeetingName, setCustomEntryMeetingName] = useState('');
  const [customEntryMeetingId, setCustomEntryMeetingId] = useState('');
  const [customEntryPassword, setCustomEntryPassword] = useState('');
  const [customEntryHour, setCustomEntryHour] = useState(8);
  const [customEntryMinutes, setCustomEntryMinutes] = useState(0);
  const [customEntryTimePeriod, setCustomEntryTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [customEntryMemberCount, setCustomEntryMemberCount] = useState(1);
  const [customEntryMemberType, setCustomEntryMemberType] = useState<'indian' | 'foreigners'>('indian');
  const [customEntryDate, setCustomEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEntryScreenshot, setCustomEntryScreenshot] = useState<File | null>(null);
  const [customEntryAttended, setCustomEntryAttended] = useState(true);
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [deleteReason, setDeleteReason] = useState<'not_live' | 'permanent'>('not_live');

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

  const playInstantMeetingSound = () => {
    if (soundMuted) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playBeep = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.4 * soundVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    playBeep(1000, audioContext.currentTime, 0.15);
    playBeep(1200, audioContext.currentTime + 0.15, 0.15);
    playBeep(1400, audioContext.currentTime + 0.3, 0.25);
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

  const checkLicenseExpiry = async () => {
    const { data: licenses } = await supabase
      .from('license_management')
      .select('*')
      .in('status', ['due', 'expired']);

    if (licenses && licenses.length > 0) {
      for (const license of licenses) {
        const daysRemaining = Math.ceil(
          (new Date(license.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        let message = '';
        let type: 'warning' | 'error' = 'warning';

        if (daysRemaining <= 0) {
          message = `License EXPIRED for ${license.client_name}! Please collect ₹${license.sold_amount.toLocaleString('en-IN')} immediately.`;
          type = 'error';
        } else if (daysRemaining <= 5) {
          message = `License due for ${license.client_name} in ${daysRemaining} days! Please collect ₹${license.sold_amount.toLocaleString('en-IN')}.`;
          type = 'warning';
        }

        if (message) {
          await supabase
            .from('notifications')
            .insert({
              user_id: null,
              message: message,
              type: type,
              is_read: false
            });
        }
      }
    }
  };

  const fetchMeetings = async () => {
    if (isLoadingMeetings) return;

    setIsLoadingMeetings(true);
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];

    try {
      // Check cache first - instant load!
      if (meetingsCache[selectedDateStr]) {
        setMeetings(meetingsCache[selectedDateStr]);

        // Use cached income calculation if available
        if (incomeCache[selectedDateStr]) {
          setTotalIncomeToday(incomeCache[selectedDateStr].total);
          setClientIncomeBreakdown(incomeCache[selectedDateStr].breakdown);
        } else if (cachedUsers.length > 0) {
          const adjustments = adjustmentsCache[selectedDateStr] || [];
          calculateTodayIncome(meetingsCache[selectedDateStr], cachedUsers, adjustments);
        }
        setIsLoadingMeetings(false);
        return;
      }

      const startOfDay = `${selectedDateStr}T00:00:00.000Z`;
      const endOfDay = `${selectedDateStr}T23:59:59.999Z`;

      // Fetch only meetings and adjustments (users cached)
      const usersToUse = cachedUsers.length > 0 ? cachedUsers : null;

      // Fetch meetings: both scheduled AND instant (created_at based)
      // This matches client panel logic to show all meetings
      const meetingsResult = await supabase
        .from('meetings')
        .select('*')
        .or(`scheduled_date.eq.${selectedDateStr},and(scheduled_date.is.null,created_at.gte.${startOfDay},created_at.lte.${endOfDay})`)
        .neq('status', 'not_live');

      // Check for errors
      if (meetingsResult.error) {
        console.error('Error fetching meetings:', meetingsResult.error);
        setMeetings([]);
      } else {
        const allMeetingsData = meetingsResult.data || [];
        setMeetings(allMeetingsData);

        // Cache meetings
        setMeetingsCache(prev => ({
          ...prev,
          [selectedDateStr]: allMeetingsData
        }));

        // Fetch adjustments and users
        const promises: Promise<any>[] = [
          supabase
            .from('due_adjustments')
            .select('client_name, amount')
            .eq('date', selectedDateStr)
        ];

        if (!usersToUse) {
          promises.push(
            supabase
              .from('users')
              .select('name, price_per_member, price_per_dp_member')
          );
        }

        const results = await Promise.all(promises);
        const adjustmentsResult = results[0];
        const usersResult = results[1];

        // Cache adjustments
        const adjustmentsData = adjustmentsResult.data || [];
        setAdjustmentsCache(prev => ({
          ...prev,
          [selectedDateStr]: adjustmentsData
        }));

        // Cache users if fetched
        const users = usersResult?.data || usersToUse || [];
        if (usersResult?.data && usersResult.data.length > 0) {
          setCachedUsers(usersResult.data);
        }

        calculateTodayIncome(allMeetingsData, users, adjustmentsData);
      }
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const fetchMonthlyIncome = async (month: Date) => {
    const year = month.getFullYear();
    const monthNum = month.getMonth();

    const startOfMonth = new Date(year, monthNum, 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(year, monthNum + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const effectiveEndDate = today < endOfMonth ? today : endOfMonth;

    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = effectiveEndDate.toISOString().split('T')[0];

    const [monthMeetingsResult, allMeetingsResult, usersResult, manualIncomeResult] = await Promise.all([
      supabase
        .from('meetings')
        .select('*')
        .neq('status', 'not_live'),
      supabase
        .from('meetings')
        .select('*')
        .neq('status', 'not_live'),
      supabase
        .from('users')
        .select('name, price_per_member, price_per_dp_member'),
      supabase
        .from('manual_income_entries')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr)
    ]);

    if (monthMeetingsResult.error || !monthMeetingsResult.data) {
      console.error('Error fetching monthly meetings:', monthMeetingsResult.error);
      return;
    }

    const users = usersResult.data || [];
    const manualIncomeEntries = manualIncomeResult.data || [];
    const incomeByDate: {[key: string]: number} = {};
    let totalEarnedTillToday = 0;

    monthMeetingsResult.data.forEach(meeting => {
      const meetingDate = meeting.scheduled_date
        ? new Date(meeting.scheduled_date)
        : new Date(meeting.created_at);

      if (meetingDate >= startOfMonth && meetingDate <= effectiveEndDate) {
        const dateStr = meetingDate.toISOString().split('T')[0];
        const user = users.find(u => u.name === meeting.client_name);

        if (user) {
          const rate = meeting.member_type === 'dp'
            ? (user.price_per_dp_member || 0)
            : (user.price_per_member || 0);
          const income = rate * (meeting.member_count || 0);

          if (!incomeByDate[dateStr]) {
            incomeByDate[dateStr] = 0;
          }
          incomeByDate[dateStr] += income;
        }
      }
    });

    manualIncomeEntries.forEach(entry => {
      const dateStr = entry.date;
      if (!incomeByDate[dateStr]) {
        incomeByDate[dateStr] = 0;
      }
      incomeByDate[dateStr] += Number(entry.amount);
    });

    if (allMeetingsResult.data) {
      allMeetingsResult.data.forEach(meeting => {
        const meetingDate = meeting.scheduled_date
          ? new Date(meeting.scheduled_date)
          : new Date(meeting.created_at);

        if (meetingDate <= today) {
          const user = users.find(u => u.name === meeting.client_name);
          if (user) {
            const rate = meeting.member_type === 'dp'
              ? (user.price_per_dp_member || 0)
              : (user.price_per_member || 0);
            const income = rate * (meeting.member_count || 0);
            totalEarnedTillToday += income;
          }
        }
      });
    }

    const allManualIncomeResult = await supabase
      .from('manual_income_entries')
      .select('*')
      .lte('date', today.toISOString().split('T')[0]);

    if (allManualIncomeResult.data) {
      allManualIncomeResult.data.forEach(entry => {
        totalEarnedTillToday += Number(entry.amount);
      });
    }

    incomeByDate['__total__'] = totalEarnedTillToday;
    setMonthlyIncome(incomeByDate);
  };

  const fetchPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .single();

    if (!error && data) {
      setUpiId(data.upi_id || '');
      setUpiQrUrl(data.qr_code_url || '');
      setTrc20Address(data.usdt_trc20_address || '');
      setTrc20QrUrl(data.usdt_trc20_qr || '');
      setBep20Address(data.usdt_bep20_address || '');
      setBep20QrUrl(data.usdt_bep20_qr || '');

      const hasData = data.upi_id || data.qr_code_url || data.usdt_trc20_address ||
                      data.usdt_trc20_qr || data.usdt_bep20_address || data.usdt_bep20_qr;
      setIsPaymentSettingsLocked(!!hasData);
      setIsEditingPaymentSettings(false);
    }
  };

  const handleQrCodeUpload = async (file: File, type: 'upi' | 'trc20' | 'bep20') => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      const updateField = type === 'upi' ? 'qr_code_url' : type === 'trc20' ? 'usdt_trc20_qr' : 'usdt_bep20_qr';

      const { error } = await supabase
        .from('payment_methods')
        .update({ [updateField]: base64String })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        alert('Error uploading QR code: ' + error.message);
      } else {
        if (type === 'upi') setUpiQrUrl(base64String);
        else if (type === 'trc20') setTrc20QrUrl(base64String);
        else setBep20QrUrl(base64String);
        alert('QR code uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const updatePaymentMethods = async () => {
    try {
      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({
          upi_id: upiId,
          usdt_trc20_address: trc20Address,
          usdt_bep20_address: bep20Address,
          updated_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (updateError) throw updateError;

      alert('Payment methods saved successfully!');
      setIsPaymentSettingsLocked(true);
      setIsEditingPaymentSettings(false);
      await fetchPaymentMethods();
    } catch (error: any) {
      alert('Error updating payment method: ' + error.message);
    }
  };

  const fetchPayments = async () => {
    const { data: paymentsData, error } = await supabase
      .from('payments')
      .select('*, users!payments_client_id_fkey(name)')
      .order('payment_date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching payments:', error);
      return;
    }

    const paymentsWithNames = paymentsData?.map((p: any) => ({
      ...p,
      client_name: p.users?.name || p.client_name || 'Unknown'
    })) || [];

    setPayments(paymentsWithNames);
  };

  const fetchUnreadPaymentCount = async () => {
    const { data, error } = await supabase
      .from('payment_receiving')
      .select('id', { count: 'exact' })
      .eq('status', 'pending');

    if (!error && data) {
      setUnreadPaymentCount(data.length);
    }
  };

  const fetchManualIncome = async (dateStr: string) => {
    const { data, error } = await supabase
      .from('manual_income_entries')
      .select('*')
      .eq('date', dateStr)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setManualIncomeEntries(data);
      return data;
    }
    return [];
  };

  const addManualIncome = async () => {
    if (!manualIncomeAmount || parseFloat(manualIncomeAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const { error } = await supabase
      .from('manual_income_entries')
      .insert({
        date: manualIncomeDate,
        amount: parseFloat(manualIncomeAmount),
        description: manualIncomeDescription || 'Manual Income Entry'
      });

    if (error) {
      console.error('Error adding manual income:', error);
      alert('Failed to add manual income');
    } else {
      setManualIncomeAmount('');
      setManualIncomeDescription('');
      setShowAddManualIncome(false);
      fetchManualIncome(manualIncomeDate);
      if (manualIncomeDate === selectedDate) {
        calculateTodayIncome(meetings);
      }
    }
  };

  const updateManualIncome = async (id: string, amount: string, description: string) => {
    const { error } = await supabase
      .from('manual_income_entries')
      .update({
        amount: parseFloat(amount),
        description: description
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating manual income:', error);
      alert('Failed to update manual income');
    } else {
      setEditingManualIncome(null);
      fetchManualIncome(selectedDate);
      calculateTodayIncome(meetings);
    }
  };

  const deleteManualIncome = async (id: string) => {
    if (!confirm('Are you sure you want to delete this manual income entry?')) return;

    const { error } = await supabase
      .from('manual_income_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting manual income:', error);
      alert('Failed to delete manual income');
    } else {
      fetchManualIncome(selectedDate);
      calculateTodayIncome(meetings);
    }
  };

  const fetchYesterdayMeetings = async (dateStr?: string) => {
    const targetDateStr = dateStr || replicateDate;
    const todayStr = new Date().toISOString().split('T')[0];

    setIsLoadingYesterdayMeetings(true);

    try {
      const [targetResult, todayResult] = await Promise.all([
        supabase
          .from('meetings')
          .select('*')
          .eq('scheduled_date', targetDateStr)
          .order('created_at', { ascending: false }),

        supabase
          .from('meetings')
          .select('meeting_id, client_name')
          .eq('scheduled_date', todayStr)
          .neq('status', 'not_live')
      ]);

      if (targetResult.error) throw targetResult.error;

      const targetMeetings = targetResult.data || [];
      const todayMeetings = todayResult.data || [];

      const todayMeetingIds = new Set(
        todayMeetings.map((m: any) => `${m.meeting_id}_${m.client_name}`)
      );

      const meetingsWithStatus = targetMeetings.map((meeting: any) => ({
        ...meeting,
        alreadyAddedToday: todayMeetingIds.has(`${meeting.meeting_id}_${meeting.client_name}`)
      }));

      setYesterdayMeetings(meetingsWithStatus);
      setSelectedMeetingsToReplicate(new Set());
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoadingYesterdayMeetings(false);
    }
  };

  const handleReplicateYesterdayData = async () => {
    setShowReplicateModal(true);
    await fetchYesterdayMeetings();
  };

  const handleOpenAllMeetings = () => {
    const liveMeetings = filteredMeetings.filter((m: any) => m.status !== 'not_live');

    if (liveMeetings.length === 0) {
      alert('No live meetings found for today!');
      return;
    }

    const confirmOpen = confirm(`Open all ${liveMeetings.length} meetings in separate tabs?`);

    if (confirmOpen) {
      liveMeetings.forEach((meeting: any, index: number) => {
        setTimeout(() => {
          const randomName = getRandomHindiName();
          const params = new URLSearchParams({
            pwd: meeting.password || '',
            uname: randomName
          });
          const zoomUrl = `https://zoom.us/wc/join/${meeting.meeting_id}?${params.toString()}`;
          window.open(zoomUrl, '_blank');
        }, index * 500);
      });
    }
  };

  const handleOpenTimeMeetings = () => {
    if (selectedTime === 'all') {
      alert('Please select a specific time slot first!');
      return;
    }

    const timeMeetings = meetings.filter((m: any) =>
      m.status !== 'not_live' &&
      `${m.hour}${m.time_period}` === selectedTime
    );

    if (timeMeetings.length === 0) {
      alert(`No live meetings found for ${selectedTime}!`);
      return;
    }

    const confirmOpen = confirm(`Open all ${timeMeetings.length} meetings for ${selectedTime} in separate tabs?`);

    if (confirmOpen) {
      timeMeetings.forEach((meeting: any, index: number) => {
        setTimeout(() => {
          const randomName = getRandomHindiName();
          const params = new URLSearchParams({
            pwd: meeting.password || '',
            uname: randomName
          });
          const zoomUrl = `https://zoom.us/wc/join/${meeting.meeting_id}?${params.toString()}`;
          window.open(zoomUrl, '_blank');
        }, index * 500);
      });
    }
  };

  const toggleMeetingSelection = (meetingId: string) => {
    const newSet = new Set(selectedMeetingsToReplicate);
    if (newSet.has(meetingId)) {
      newSet.delete(meetingId);
    } else {
      newSet.add(meetingId);
    }
    setSelectedMeetingsToReplicate(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedMeetingsToReplicate.size === yesterdayMeetings.length) {
      setSelectedMeetingsToReplicate(new Set());
    } else {
      setSelectedMeetingsToReplicate(new Set(yesterdayMeetings.map(m => m.id)));
    }
  };

  const replicateSelectedMeetings = async () => {
    if (selectedMeetingsToReplicate.size === 0) {
      alert('Please select at least one meeting to replicate');
      return;
    }

    const meetingsToReplicate = yesterdayMeetings.filter(m =>
      selectedMeetingsToReplicate.has(m.id) && !m.alreadyAddedToday
    );

    if (meetingsToReplicate.length === 0) {
      alert('All selected meetings are already added to today\'s list!');
      return;
    }

    const alreadyAddedCount = Array.from(selectedMeetingsToReplicate).filter(id => {
      const meeting = yesterdayMeetings.find(m => m.id === id);
      return meeting?.alreadyAddedToday;
    }).length;

    const todayStr = new Date().toISOString().split('T')[0];

    const replicatedMeetings = meetingsToReplicate.map(meeting => ({
      meeting_name: meeting.meeting_name,
      meeting_id: meeting.meeting_id,
      password: meeting.password,
      hour: meeting.hour,
      minutes: meeting.minutes,
      time_period: meeting.time_period,
      member_count: meeting.member_count,
      member_type: meeting.member_type,
      client_id: meeting.client_id,
      client_name: meeting.client_name,
      is_instant: meeting.is_instant,
      attended: false,
      status: 'active',
      admin_id: meeting.admin_id,
      scheduled_date: todayStr
    }));

    const { data: insertedMeetings, error } = await supabase
      .from('meetings')
      .insert(replicatedMeetings)
      .select();

    if (error) {
      console.error('Error replicating meetings:', error);
      alert('Failed to replicate meetings: ' + error.message);
    } else {
      let message = `Successfully replicated ${replicatedMeetings.length} meeting(s)!`;
      if (alreadyAddedCount > 0) {
        message += `\n\n${alreadyAddedCount} meeting(s) were skipped as they are already in today's list.`;
      }
      alert(message);

      setMeetings(prev => [...(insertedMeetings || []), ...prev]);

      setShowReplicateModal(false);
      setSelectedMeetingsToReplicate(new Set());
    }
  };

  const handleCustomEntry = async () => {
    if (!customEntryClient || !customEntryMeetingName || !customEntryMeetingId || !customEntryPassword) {
      alert('Please fill in all required fields');
      return;
    }

    let screenshotUrl = '';

    if (customEntryScreenshot) {
      const fileExt = customEntryScreenshot.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-screenshots')
        .upload(filePath, customEntryScreenshot);

      if (uploadError) {
        alert('Error uploading screenshot: ' + uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('meeting-screenshots')
        .getPublicUrl(filePath);

      screenshotUrl = urlData.publicUrl;
    }

    const { data: clientData } = await supabase
      .from('users')
      .select('id')
      .eq('name', customEntryClient)
      .single();

    const { error } = await supabase
      .from('meetings')
      .insert({
        meeting_name: customEntryMeetingName,
        meeting_id: customEntryMeetingId,
        password: customEntryPassword,
        hour: customEntryHour,
        minutes: customEntryMinutes,
        time_period: customEntryTimePeriod,
        member_count: customEntryMemberCount,
        member_type: customEntryMemberType,
        client_name: customEntryClient,
        client_id: clientData?.id,
        attended: customEntryAttended,
        screenshot_url: screenshotUrl,
        scheduled_date: customEntryDate,
        status: 'active',
        is_instant: false
      });

    if (error) {
      alert('Error creating custom entry: ' + error.message);
      return;
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: clientData?.id,
        message: `Admin created custom meeting entry for ${new Date(customEntryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        type: 'screenshot',
        read: false
      });

    await supabase.rpc('calculate_daily_dues_for_client', {
      p_client_name: customEntryClient,
      p_date: customEntryDate
    });

    alert('Custom meeting entry created successfully!');
    setShowCustomEntryModal(false);

    setCustomEntryClient('');
    setCustomEntryMeetingName('');
    setCustomEntryMeetingId('');
    setCustomEntryPassword('');
    setCustomEntryHour(8);
    setCustomEntryMinutes(0);
    setCustomEntryTimePeriod('PM');
    setCustomEntryMemberCount(1);
    setCustomEntryMemberType('indian');
    setCustomEntryDate(new Date().toISOString().split('T')[0]);
    setCustomEntryScreenshot(null);
    setCustomEntryAttended(true);

    await fetchMeetings();
  };

  const calculateTodayIncome = async (meetingsData: Meeting[], usersCache?: any[], adjustmentsCache?: any[], manualIncomeCache?: any[]) => {
    const targetDate = new Date(selectedDate).toDateString();
    const todaysMeetings = meetingsData.filter(m => {
      const meetingDate = new Date(m.created_at).toDateString();
      return meetingDate === targetDate && m.screenshot_url && m.screenshot_url.trim() !== '';
    });

    // Use cached data if available
    let users = usersCache;
    if (!users) {
      const { data, error } = await supabase
        .from('users')
        .select('name, price_per_member, price_per_dp_member');

      if (error || !data) {
        setTotalIncomeToday(0);
        setClientIncomeBreakdown([]);
        return;
      }
      users = data;
    }

    let adjustments = adjustmentsCache;
    if (!adjustments) {
      const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
      const { data } = await supabase
        .from('due_adjustments')
        .select('client_name, amount')
        .eq('date', selectedDateStr);
      adjustments = data || [];
    }

    // Fetch manual income entries for the selected date
    let manualIncome = manualIncomeCache;
    if (!manualIncome) {
      const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
      manualIncome = await fetchManualIncome(selectedDateStr);
    }

    const clientMap = new Map<string, {totalMembers: number; totalIncome: number; rate: number; dpRate: number; adjustments: number}>();

    for (const meeting of todaysMeetings) {
      const user = users.find(u => u.name === meeting.client_name);
      if (user && meeting.client_name) {
        const memberCount = meeting.member_count || 0;
        const memberType = (meeting as any).member_type || 'indian';
        const rateToUse = memberType === 'foreign'
          ? ((user as any).price_per_foreign_member || user.price_per_member || 0)
          : (user.price_per_member || 0);
        const meetingIncome = memberCount * rateToUse;

        const existing = clientMap.get(meeting.client_name);
        if (existing) {
          existing.totalMembers += memberCount;
          existing.totalIncome += meetingIncome;
        } else {
          clientMap.set(meeting.client_name, {
            totalMembers: memberCount,
            totalIncome: meetingIncome,
            rate: user.price_per_member || 0,
            dpRate: (user as any).price_per_dp_member || 240,
            adjustments: 0
          });
        }
      }
    }

    if (adjustments && adjustments.length > 0) {
      for (const adj of adjustments) {
        const existing = clientMap.get(adj.client_name);
        if (existing) {
          existing.adjustments = (existing.adjustments || 0) + Number(adj.amount);
        } else {
          const user = users.find(u => u.name === adj.client_name);
          if (user) {
            clientMap.set(adj.client_name, {
              totalMembers: 0,
              totalIncome: 0,
              rate: user.price_per_member || 0,
              dpRate: (user as any).price_per_dp_member || 240,
              adjustments: Number(adj.amount)
            });
          }
        }
      }
    }

    const breakdown = Array.from(clientMap.entries()).map(([clientName, data]) => ({
      clientName,
      members: data.totalMembers,
      rate: data.rate,
      income: data.totalIncome,
      adjustments: data.adjustments || 0,
      total: data.totalIncome + (data.adjustments || 0)
    }));

    // Add manual income to total
    const manualIncomeTotal = manualIncome?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;
    const totalIncome = breakdown.reduce((sum, item) => sum + item.total, 0) + manualIncomeTotal;

    setTotalIncomeToday(totalIncome);
    setClientIncomeBreakdown(breakdown as any);

    // Cache the income calculation for instant retrieval
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
    setIncomeCache(prev => ({
      ...prev,
      [selectedDateStr]: {
        total: totalIncome,
        breakdown: breakdown as any
      }
    }));
  };

  const calculateEstimatedIncomeToday = async () => {
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];

    const { data: allMeetings } = await supabase
      .from('meetings')
      .select('client_name, member_count, member_type')
      .eq('scheduled_date', selectedDateStr)
      .neq('status', 'not_live');

    if (!allMeetings || allMeetings.length === 0) {
      setEstimatedIncomeToday(0);
      return;
    }

    const { data: users } = await supabase
      .from('users')
      .select('name, price_per_member, price_per_dp_member, foreign_member_rate');

    if (!users) {
      setEstimatedIncomeToday(0);
      return;
    }

    const userRates = new Map(
      users.map(u => [
        u.name,
        {
          indian: Number(u.price_per_member) || 0,
          dp: Number(u.price_per_dp_member) || 240,
          foreigners: Number(u.foreign_member_rate) || Number(u.price_per_member) || 0
        }
      ])
    );

    let totalEstimated = 0;
    allMeetings.forEach(meeting => {
      const rates = userRates.get(meeting.client_name);
      if (!rates) return;

      const memberCount = meeting.member_count || 0;
      const memberType = meeting.member_type || 'indian';

      let rate = rates.indian;
      if (memberType === 'dp') rate = rates.dp;
      else if (memberType === 'foreigners') rate = rates.foreigners;

      totalEstimated += memberCount * rate;
    });

    setEstimatedIncomeToday(totalEstimated);
  };

  const calculateIncomeTillToday = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Fetch only unpaid dues (paid entries are deleted by trigger)
    const { data: allDues } = await supabase
      .from('daily_dues')
      .select('client_name, amount, date')
      .lte('date', today);

    const { data: allManualIncome } = await supabase
      .from('manual_income_entries')
      .select('amount')
      .lte('date', today);

    // Calculate totals
    // daily_dues already contains ONLY unpaid amounts (paid are deleted)
    const totalDues = allDues?.reduce((sum, due) => sum + Number(due.amount), 0) || 0;
    const manualTotal = allManualIncome?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

    // Net receivable = Sum of unpaid dues (no subtraction needed!)
    const totalNetReceivable = totalDues;

    // Calculate breakdown per client
    // daily_dues already contains only unpaid entries
    const clientDuesMap = new Map<string, number>();

    allDues?.forEach(due => {
      const current = clientDuesMap.get(due.client_name) || 0;
      clientDuesMap.set(due.client_name, current + Number(due.amount));
    });

    const duesBreakdown: {clientName: string; totalDue: number}[] = [];
    clientDuesMap.forEach((balance, clientName) => {
      if (balance > 0) {
        duesBreakdown.push({ clientName, totalDue: balance });
      }
    });

    duesBreakdown.sort((a, b) => b.totalDue - a.totalDue);

    setClientDuesTillToday(duesBreakdown);
    setTotalIncomeTillToday(totalNetReceivable + manualTotal);
  };

  const calculateNovemberEarnings = async () => {
    const { data: novemberDues } = await supabase
      .from('daily_dues')
      .select('amount')
      .gte('date', '2025-11-01')
      .lte('date', '2025-11-30');

    const totalNovemberDues = novemberDues?.reduce((sum, due) => sum + Number(due.amount), 0) || 0;
    setNovemberTotalEarnings(totalNovemberDues);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchMeetings(),
        fetchPayments(),
        fetchPaymentMethods(),
        fetchUnreadPaymentCount(),
        checkLicenseExpiry()
      ]);
      await calculateIncomeTillToday();
      await calculateNovemberEarnings();
    };
    loadData();

    const subscription = supabase
      .channel('admin_meetings_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload) => {
        console.log('Admin: Meeting change detected', payload);

        if (payload.eventType === 'INSERT' && payload.new) {
          const meeting = payload.new as any;

          // Get meeting date: use scheduled_date if available, otherwise created_at
          const meetingDate = meeting.scheduled_date || new Date(meeting.created_at).toISOString().split('T')[0];
          const currentSelectedDate = selectedDate;

          if (meetingDate === currentSelectedDate) {
            setMeetings(prev => [meeting, ...prev]);
          }

          // Update cache
          setMeetingsCache(prev => {
            const cached = prev[meetingDate] || [];
            return {
              ...prev,
              [meetingDate]: [meeting, ...cached]
            };
          });

          if (meeting.client_name) {
            const mins = (meeting.minutes === undefined || meeting.minutes === null) ? 0 : Math.min(meeting.minutes, 59);
            const hour = meeting.hour || 'N/A';
            const period = meeting.time_period || '';
            const displayTime = mins === 0 ? `${hour} ${period}` : `${hour}:${String(mins).padStart(2, '0')} ${period}`;
            const newNotification = {
              id: meeting.id,
              clientName: meeting.client_name,
              meetingName: meeting.meeting_name,
              memberCount: meeting.member_count || 0,
              time: displayTime,
              read: false
            };
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            playNotificationSound();
          }

          if (meeting.is_instant) {
            playInstantMeetingSound();
          }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedMeeting = payload.new as any;
          setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));

          // Update cache - use scheduled_date if available, otherwise created_at
          const meetingDate = updatedMeeting.scheduled_date || new Date(updatedMeeting.created_at).toISOString().split('T')[0];
          setMeetingsCache(prev => ({
            ...prev,
            [meetingDate]: (prev[meetingDate] || []).map(m => m.id === updatedMeeting.id ? updatedMeeting : m)
          }));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const deletedId = (payload.old as any).id;
          setMeetings(prev => prev.filter(m => m.id !== deletedId));

          // Update cache - remove from all dates
          setMeetingsCache(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(date => {
              updated[date] = updated[date].filter(m => m.id !== deletedId);
            });
            return updated;
          });
        }
      })
      .subscribe();

    const paymentsSubscription = supabase
      .channel('admin_payments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        console.log('Admin: Payment change detected', payload);
        fetchPayments();
      })
      .subscribe();

    const adjustmentsSubscription = supabase
      .channel('admin_adjustments_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'due_adjustments' }, (payload) => {
        console.log('Admin: Adjustment change detected', payload);
        const adj = payload.new as any;
        if (adj && adj.date === selectedDate) {
          fetchMeetings();
        }
      })
      .subscribe();

    const manualIncomeSubscription = supabase
      .channel('admin_manual_income_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_income_entries' }, (payload) => {
        console.log('Admin: Manual income change detected', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          const entry = payload.new || payload.old;
          if (entry && entry.date === selectedDate) {
            fetchManualIncome(selectedDate);
            calculateTodayIncome(meetings);
          }
        }
      })
      .subscribe();

    const paymentReceivingSubscription = supabase
      .channel('admin_payment_receiving_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_receiving' }, (payload) => {
        console.log('Admin: Payment receiving change detected', payload);
        fetchUnreadPaymentCount();
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
        }
      })
      .subscribe();

    const handlePaste = async (e: ClipboardEvent) => {
      const targetMeetingId = selectedMeetingForScreenshot || hoveredUploadBox;
      if (!targetMeetingId) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            if (selectedMeetingForScreenshot) {
              const reader = new FileReader();
              reader.onload = (event) => {
                setPastedImage(event.target?.result as string);
              };
              reader.readAsDataURL(blob);
            } else if (hoveredUploadBox) {
              const file = new File([blob], 'pasted-screenshot.png', { type: blob.type });
              handleScreenshotUpload(hoveredUploadBox, file);
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      subscription.unsubscribe();
      paymentsSubscription.unsubscribe();
      adjustmentsSubscription.unsubscribe();
      manualIncomeSubscription.unsubscribe();
      paymentReceivingSubscription.unsubscribe();
      document.removeEventListener('paste', handlePaste);
    };
  }, [selectedMeetingForScreenshot, hoveredUploadBox]);

  useEffect(() => {
    fetchMeetings();
    fetchManualIncome(selectedDate);
    setShowIncomeAmount(false);
  }, [selectedDate]);

  useEffect(() => {
    const selectedDateStr = new Date(selectedDate).toISOString().split('T')[0];
    const startOfDay = `${selectedDateStr}T00:00:00.000Z`;
    const endOfDay = `${selectedDateStr}T23:59:59.999Z`;

    const subscription = supabase
      .channel('meetings_realtime')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meetings',
          filter: `created_at=gte.${startOfDay},created_at=lte.${endOfDay}`
        },
        (payload) => {
          const newMeeting = payload.new as Meeting;
          if (newMeeting.client_id) {
            setNewlyAddedMeetingIds(prev => new Set(prev).add(newMeeting.id));
            setMeetings(prev => [newMeeting, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDate]);

  useEffect(() => {
    if (meetings.length > 0) {
      calculateTodayIncome(meetings);
    }
  }, [meetings]);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const istHours = now.getHours();
      const istMinutes = now.getMinutes();

      if (istHours === 0 && istMinutes === 0) {
        const newDate = now.toISOString().split('T')[0];
        setSelectedDate(newDate);
        fetchMeetings();
        setNotifications([]);
        setUnreadCount(0);
      }
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  const handleJoinMeeting = (meetingId: string, password: string, meetingName: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const randomName = getRandomHindiName();
    joinZoomMeeting({
      meetingId,
      password,
      meetingName,
      userName: randomName
    });
    return false;
  };

  const handleSearchMeeting = async () => {
    if (!searchMeetingId.trim()) {
      alert('Please enter a meeting ID or name');
      return;
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const searchTerm = searchMeetingId.trim();

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .or(`meeting_id.ilike.%${searchTerm}%,meeting_name.ilike.%${searchTerm}%`)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching meetings:', error);
      alert('Error searching meetings');
      return;
    }

    if (!data || data.length === 0) {
      alert('No meetings found with this ID/Name for selected date');
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchResults(data);
    setShowSearchResults(true);
  };

  const toggleAttended = async (meeting: Meeting) => {
    setMeetings(prev => prev.map(m =>
      m.id === meeting.id ? { ...m, attended: !m.attended } : m
    ));

    const { error } = await supabase
      .from('meetings')
      .update({ attended: !meeting.attended, updated_at: new Date().toISOString() })
      .eq('id', meeting.id);

    if (error) {
      console.error('Error updating meeting:', error);
      setMeetings(prev => prev.map(m =>
        m.id === meeting.id ? { ...m, attended: meeting.attended } : m
      ));
    }
  };

  const generateDailyInvoice = () => {
    const today = new Date().toLocaleDateString();
    const meetings = clientIncomeBreakdown.map(item => ({
      name: item.clientName,
      members: item.members,
      rate: item.rate,
      total: item.total || item.income,
      adjustments: item.adjustments
    }));

    generateInvoicePDF({
      clientName: 'All Clients',
      date: today,
      meetings,
      totalAmount: totalIncomeToday
    });
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.meeting_id) {
      setHighlightedMeetingId(notification.meeting_id);

      setTimeout(() => {
        const meetingElement = document.getElementById(`meeting-${notification.meeting_id}`);
        if (meetingElement) {
          meetingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      setTimeout(() => {
        setHighlightedMeetingId(null);
      }, 3000);
    }

    if (notification.metadata?.screenshot_url) {
      setSelectedScreenshot(notification.metadata.screenshot_url);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    setMeetings(prev => prev.filter(m => m.id !== meetingId));
    setSearchResults(prev => prev.filter(m => m.id !== meetingId));

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (error) {
      console.error('Error deleting meeting:', error);
      alert('Error deleting meeting');
      fetchMeetings();
    }
  };

  const markAsNotLive = async (meetingId: string) => {
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'not_live' as const } : m));
    setSearchResults(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'not_live' as const } : m));

    const { error } = await supabase
      .from('meetings')
      .update({ status: 'not_live' })
      .eq('id', meetingId);

    if (error) {
      console.error('Error marking as not live:', error);
      alert('Error marking meeting as not live');
      fetchMeetings();
    }
  };

  const fetchPreviousMeetings = async () => {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      const uniqueMeetings = data.reduce((acc: Meeting[], curr) => {
        if (!acc.find(m =>
          m.meeting_id === curr.meeting_id &&
          m.password === curr.password &&
          m.meeting_name === curr.meeting_name
        )) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setPreviousMeetings(uniqueMeetings);
    }
  };

  const deleteTodayRecords = async (clientName?: string) => {
    const confirmMsg = clientName
      ? `Are you sure you want to delete all today's records for ${clientName}?`
      : `Are you sure you want to delete ALL today's records for ALL clients?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    const today = selectedDate;
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split('T')[0];

    let deleteQuery = supabase
      .from('meetings')
      .delete()
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${nextDayStr}T00:00:00.000Z`);

    if (clientName) {
      deleteQuery = deleteQuery.eq('meeting_name', clientName);
    }

    const { error, count } = await deleteQuery;

    if (error) {
      alert('Error deleting records: ' + error.message);
      console.error('Delete error:', error);
    } else {
      alert(clientName
        ? `All today's records for ${clientName} have been deleted.`
        : `All today's records have been deleted.`
      );
      await fetchMeetings();
      await fetchPayments();
    }
  };

  const handleScreenshotUpload = async (meetingId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      const meeting = meetings.find(m => m.id === meetingId);

      const updateData: any = {
        screenshot_url: base64Image,
        attended: true,
        updated_at: new Date().toISOString()
      };

      if (meeting && !meeting.scheduled_date) {
        updateData.scheduled_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', meetingId);

      if (error) {
        console.error('Error uploading screenshot:', error);
        alert('Failed to upload screenshot: ' + error.message);
      } else {
        const scheduledDate = meeting?.scheduled_date || new Date().toISOString().split('T')[0];

        setMeetings(prev => prev.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              screenshot_url: base64Image,
              attended: true,
              scheduled_date: scheduledDate,
              updated_at: new Date().toISOString()
            };
          }
          return m;
        }));

        setSearchResults(prev => prev.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              screenshot_url: base64Image,
              attended: true,
              scheduled_date: scheduledDate,
              updated_at: new Date().toISOString()
            };
          }
          return m;
        }));

        setNewlyAddedMeetingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(meetingId);
          return newSet;
        });
        setHoveredUploadBox(null);

        setMeetingsCache(prev => ({
          ...prev,
          [scheduledDate]: (prev[scheduledDate] || []).map(m =>
            m.id === meetingId
              ? { ...m, screenshot_url: base64Image, attended: true, scheduled_date: scheduledDate, updated_at: new Date().toISOString() }
              : m
          )
        }));

        if (meeting?.client_name) {
          supabase.rpc('calculate_daily_dues_for_client', {
            p_client_name: meeting.client_name,
            p_date: scheduledDate
          }).then(() => {
            calculateNovemberEarnings();
          });
        } else {
          calculateNovemberEarnings();
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadScreenshot = async () => {
    if (!pastedImage || !selectedMeetingForScreenshot) return;

    const meeting = meetings.find(m => m.id === selectedMeetingForScreenshot);

    if (!meeting) {
      alert('Meeting not found');
      return;
    }

    const updateData: any = {
      screenshot_url: pastedImage,
      attended: true,
      updated_at: new Date().toISOString()
    };

    if (!meeting.scheduled_date) {
      updateData.scheduled_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', selectedMeetingForScreenshot);

    if (error) {
      console.error('Error uploading screenshot:', error);
      alert('Failed to upload screenshot: ' + error.message);
    } else {
      const scheduledDate = meeting.scheduled_date || new Date().toISOString().split('T')[0];

      setMeetings(prev => prev.map(m => {
        if (m.id === selectedMeetingForScreenshot) {
          return {
            ...m,
            screenshot_url: pastedImage,
            attended: true,
            scheduled_date: scheduledDate,
            updated_at: new Date().toISOString()
          };
        }
        return m;
      }));

      setSearchResults(prev => prev.map(m => {
        if (m.id === selectedMeetingForScreenshot) {
          return {
            ...m,
            screenshot_url: pastedImage,
            attended: true,
            scheduled_date: scheduledDate,
            updated_at: new Date().toISOString()
          };
        }
        return m;
      }));

      setNewlyAddedMeetingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedMeetingForScreenshot);
        return newSet;
      });

      setMeetingsCache(prev => ({
        ...prev,
        [scheduledDate]: (prev[scheduledDate] || []).map(m =>
          m.id === selectedMeetingForScreenshot
            ? { ...m, screenshot_url: pastedImage, attended: true, scheduled_date: scheduledDate, updated_at: new Date().toISOString() }
            : m
        )
      }));

      setPastedImage(null);
      setSelectedMeetingForScreenshot(null);

      if (meeting.client_name) {
        supabase.rpc('calculate_daily_dues_for_client', {
          p_client_name: meeting.client_name,
          p_date: scheduledDate
        }).then(() => {
          calculateNovemberEarnings();
        });
      } else {
        calculateNovemberEarnings();
      }
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => {
    const aIsNewlyAdded = newlyAddedMeetingIds.has(a.id) && a.client_id && !a.attended;
    const bIsNewlyAdded = newlyAddedMeetingIds.has(b.id) && b.client_id && !b.attended;

    if (aIsNewlyAdded !== bIsNewlyAdded) {
      return aIsNewlyAdded ? -1 : 1;
    }

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

    if (minutesA !== minutesB) {
      return hourB - hourA >= 0 ? minutesB - minutesA : minutesA - minutesB;
    }

    return (b.member_count || 0) - (a.member_count || 0);
  });

  const dateFilteredMeetings = sortedMeetings.filter(m => {
    const meetingDate = (m as any).scheduled_date
      ? (m as any).scheduled_date
      : new Date(m.created_at).toISOString().split('T')[0];
    return meetingDate === selectedDate;
  });

  const filteredMeetings = selectedTime === 'all'
    ? dateFilteredMeetings
    : dateFilteredMeetings.filter(m =>
        m.hour !== undefined &&
        m.time_period !== undefined &&
        `${m.hour}${m.time_period}` === selectedTime
      );

  const instantMeetings = filteredMeetings.filter(m => m.is_instant && !m.attended);
  const regularMeetings = filteredMeetings.filter(m => !m.is_instant || m.attended);

  const timeSlots = Array.from(new Set(
    meetings
      .filter(m => m.hour !== undefined && m.time_period !== undefined)
      .map(m => `${m.hour}${m.time_period}`)
  )).sort((a, b) => {
    const hourA = parseInt(a) + (a.includes('PM') ? 12 : 0);
    const hourB = parseInt(b) + (b.includes('PM') ? 12 : 0);
    return hourB - hourA;
  });

  const MeetingCard = ({ meeting, isInstant = false }: { meeting: Meeting; isInstant?: boolean }) => {
    const isClientLive = newlyAddedMeetingIds.has(meeting.id) && meeting.client_id && !meeting.attended;

    return (
    <div
      id={`meeting-${meeting.id}`}
      className={`group relative transition-all duration-300 ${meeting.attended ? 'opacity-60' : ''} ${
        isInstant && !meeting.attended && (!meeting.screenshot_url || meeting.screenshot_url === '') ? 'flame-box' : ''
      }`}
      style={{ perspective: '1000px' }}
    >
      {isClientLive && (
        <>
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 opacity-90 blur-md"
               style={{ animation: 'laser-pulse 2s ease-in-out infinite' }} />
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 opacity-60"
               style={{ animation: 'laser-glow 3s ease-in-out infinite alternate' }} />
        </>
      )}

      <div className={`absolute inset-0 rounded-xl blur-xl opacity-30 ${
        isInstant
          ? 'bg-gradient-to-br from-amber-400 to-red-400'
          : isDark
          ? 'bg-gradient-to-br from-slate-600 to-slate-800'
          : 'bg-gradient-to-br from-gray-200 to-gray-300'
      }`} style={{ transform: 'translateY(8px) scale(0.95)' }} />

      <div className={`absolute inset-0 rounded-xl ${
        isInstant
          ? 'bg-gradient-to-br from-amber-300 to-orange-300'
          : isDark
          ? 'bg-gradient-to-br from-slate-600 to-slate-700'
          : 'bg-gradient-to-br from-gray-100 to-gray-200'
      }`} style={{ transform: 'translateY(4px) scale(0.98)' }} />

      <div
        className={`relative rounded-xl overflow-hidden transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2 ${
          highlightedMeetingId === meeting.id
            ? 'ring-4 ring-purple-400 shadow-2xl'
            : isClientLive
            ? 'ring-4 ring-blue-400 shadow-2xl shadow-blue-500/50'
            : 'shadow-lg'
        }`}
        style={{ transform: 'translateZ(0)' }}
      >
        <div className={`absolute inset-0 ${
          isInstant
            ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
            : isDark
            ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900'
            : 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700'
        }`} />

      <div className={`relative p-5 ${isDark ? 'text-white' : 'text-white'}`}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1">
                {isInstant && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md text-xs font-bold animate-pulse">
                    <Zap size={12} />
                    INSTANT
                  </span>
                )}
                <h3 className="text-2xl font-bold truncate">
                  {meeting.meeting_name}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Users size={28} />
                <span>{meeting.member_count || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                <div className="text-xs text-white/60 mb-1">Meeting ID</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{meeting.meeting_id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(meeting.meeting_id);
                      alert('Copied!');
                    }}
                    className="p-1 hover:bg-white/20 rounded transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                <div className="text-xs text-white/60 mb-1">Password</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{meeting.password}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(meeting.password);
                      alert('Copied!');
                    }}
                    className="p-1 hover:bg-white/20 rounded transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {meeting.client_name && (
                <span className="px-4 py-2 bg-blue-500/80 rounded-full text-base font-bold">
                  {meeting.client_name}
                </span>
              )}
              {meeting.hour !== undefined && meeting.time_period && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-base font-bold">
                  <Clock size={18} className="text-blue-300" />
                  <span className="text-lg">{meeting.hour}:{meeting.minutes === 60 || meeting.minutes === 0 ? '00' : String(meeting.minutes ?? 15).padStart(2, '0')} {meeting.time_period}</span>
                </span>
              )}
              {meeting.member_type && (
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-base font-bold">
                  {meeting.member_type === 'foreigners' ? '🌍 Foreigners' : '🇮🇳 Indian'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {meeting.screenshot_url ? (
              <button
                onClick={() => setSelectedScreenshot(meeting.screenshot_url || null)}
                className="px-4 py-2 bg-green-500/80 hover:bg-green-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap"
              >
                <Eye size={14} />
                View
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedMeetingForScreenshot(meeting.id);
                  setPastedImage(null);
                }}
                className="px-4 py-2 bg-purple-500/80 hover:bg-purple-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap"
              >
                <ImageIcon size={14} />
                Upload
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const scrollPosition = window.scrollY;
              handleJoinMeeting(meeting.meeting_id, meeting.password, meeting.meeting_name, e);
              setTimeout(() => window.scrollTo(0, scrollPosition), 0);
              setTimeout(() => window.scrollTo(0, scrollPosition), 10);
              setTimeout(() => window.scrollTo(0, scrollPosition), 50);
              setTimeout(() => window.scrollTo(0, scrollPosition), 100);
              return false;
            }}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-900 font-bold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg flame-button"
          >
            <Video size={16} />
            Join Meeting
          </button>

          {!meeting.screenshot_url && (
            <button
              onClick={() => markAsNotLive(meeting.id)}
              className="p-2.5 bg-orange-500/20 hover:bg-orange-500/40 rounded-lg transition-all"
              title="Mark as Not Live (Single Click)"
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={() => deleteMeeting(meeting.id)}
            className="p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-all"
            title="Delete Permanently (Single Click)"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      <div className="container mx-auto max-w-[1800px] py-4 md:py-6 px-4 md:px-6 lg:px-8">
        <div className={`rounded-3xl shadow-2xl p-6 md:p-8 mb-6 border backdrop-blur-xl transition-all duration-500 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border-slate-700/50'
            : 'bg-white/80 border-gray-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                  isDark ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                }`}>
                  <span className="text-white text-xl font-bold">A</span>
                </div>
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    Admin Panel
                  </h1>
                  <p className={`text-xs md:text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Welcome, Junaid • <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{dateFilteredMeetings.length} meetings today</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-3 py-2 rounded-xl border ${
                  isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    <span className={`font-semibold text-sm ${
                      isDark ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      {new Date().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-xl border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                    <span className={`font-bold text-sm font-mono ${
                      isDark ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      {currentTime.toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    setNotifications(prev => prev.map(n => ({...n, read: true})));
                    setUnreadCount(0);
                  }
                }}
                className={`relative p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  showNotifications
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-purple-400'
                    : isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Notifications"
              >
                <Bell
                  size={22}
                  className={showNotifications ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'}
                  strokeWidth={2.5}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center animate-pulse shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
              >
                {isDark ? <Sun size={22} className="text-yellow-400" strokeWidth={2.5} /> : <Moon size={22} className="text-gray-700" strokeWidth={2.5} />}
              </button>
              <button
                onClick={() => {
                  setShowPaymentReceiving(!showPaymentReceiving);
                }}
                className={`relative p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  showPaymentReceiving
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 border-2 border-emerald-400'
                    : isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Payment Receiving"
              >
                <IndianRupee size={22} className={showPaymentReceiving ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
                {unreadPaymentCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center animate-pulse shadow-lg">
                    {unreadPaymentCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowPaymentSettings(true)}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Payment Settings"
              >
                <Settings size={22} className={isDark ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setShowClientsOverview(!showClientsOverview)}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  showClientsOverview
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-2 border-blue-400'
                    : isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Clients Overview"
              >
                <Users size={22} className={showClientsOverview ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setShowLicenseManagement(!showLicenseManagement)}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  showLicenseManagement
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-amber-400'
                    : isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="License Management"
              >
                <Shield size={22} className={showLicenseManagement ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setShowAdvancePayments(!showAdvancePayments)}
                className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 ${
                  showAdvancePayments
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 border-2 border-teal-400'
                    : isDark
                    ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
                }`}
                title="Advance Payments"
              >
                <IndianRupee size={22} className={showAdvancePayments ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setShowDueAdjustment(!showDueAdjustment)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 border-2 border-purple-400"
                title="DP Member Adjustments"
              >
                <Users size={22} className="text-white" strokeWidth={2.5} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowOpenMeetingsDropdown(!showOpenMeetingsDropdown)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 border border-orange-400/30"
                  title="Open Meetings Options"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </button>
                {showOpenMeetingsDropdown && (
                  <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-50 overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                      <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Open Meetings</h3>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          handleOpenAllMeetings();
                          setShowOpenMeetingsDropdown(false);
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 mb-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Open All Live
                      </button>
                      {timeSlots.length > 0 && (
                        <>
                          <div className={`px-2 py-2 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            By Time Slot:
                          </div>
                          {timeSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => {
                                setSelectedTime(slot);
                                handleOpenTimeMeetings();
                                setShowOpenMeetingsDropdown(false);
                              }}
                              className={`w-full px-4 py-2 rounded-lg mb-1 text-sm font-semibold transition-all ${
                                isDark
                                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
                >
                  <LogOut size={18} />
                  <span className="hidden md:inline">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <PaymentReceiving
            onApprove={() => fetchPayments()}
            isOpen={showPaymentReceiving}
            onToggle={() => setShowPaymentReceiving(!showPaymentReceiving)}
          />
        </div>

        {showLicenseManagement && (
          <div className="mb-6">
            <LicenseManagement />
          </div>
        )}

        {showAdvancePayments && (
          <AdvancePaymentManagement
            isDark={isDark}
            onClose={() => setShowAdvancePayments(false)}
          />
        )}

        {showDueAdjustment && (
          <DueAdjustmentPanel
            isDark={isDark}
            onClose={() => setShowDueAdjustment(false)}
            adminName="Junaid"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-5 hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.5)] transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            onMouseEnter={() => playMoneyCountingSound()}
          >
            <div className="flex items-center justify-center gap-3">
              <div className="text-center flex-1">
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <p className="text-sm text-green-100 font-semibold">Net Receivable Today</p>
                    <p className="text-4xl font-black text-white">
                      {showIncomeAmount ? `₹${formatIndianNumber(totalIncomeToday)}` : '₹•••••'}
                    </p>
                    {clientIncomeBreakdown.length > 0 && (
                      <button
                        onClick={() => setShowIncomeBreakdown(!showIncomeBreakdown)}
                        className="mt-2 text-xs text-green-100 hover:text-white underline transition-colors"
                      >
                        {showIncomeBreakdown ? 'Hide' : 'View'} Client Breakdown
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowIncomeAmount(!showIncomeAmount)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-xl transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                    title={showIncomeAmount ? 'Hide Amount' : 'Show Amount'}
                  >
                    {showIncomeAmount ? (
                      <Eye size={20} className="text-white" />
                    ) : (
                      <EyeOff size={20} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-blue-600 via-cyan-600 to-sky-600 rounded-2xl shadow-2xl p-5 hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.5)] transition-all duration-500 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="text-center flex-1">
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <p className="text-sm text-blue-100 font-semibold">Net Receivable Till Today</p>
                    <p className="text-4xl font-black text-white">
                      {showIncomeAmount ? `₹${formatIndianNumber(totalIncomeTillToday)}` : '₹•••••'}
                    </p>
                    <p className="text-xs text-blue-100 mt-1">From all clients</p>
                    {clientDuesTillToday.length > 0 && (
                      <button
                        onClick={() => setShowDuesBreakdown(!showDuesBreakdown)}
                        className="mt-2 text-xs text-blue-100 hover:text-white underline transition-colors"
                      >
                        {showDuesBreakdown ? 'Hide' : 'View'} Client Breakdown
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowIncomeAmount(!showIncomeAmount)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-xl transition-all duration-300 border border-white/30 hover:border-white/40 shadow-lg hover:scale-110"
                    title={showIncomeAmount ? 'Hide Amount' : 'Show Amount'}
                  >
                    {showIncomeAmount ? (
                      <Eye size={20} className="text-white" />
                    ) : (
                      <EyeOff size={20} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {showDuesBreakdown && clientDuesTillToday.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-sky-600 rounded-2xl shadow-2xl p-5 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3">Net Receivable by Client (Till Today)</h3>
              <div className="space-y-2">
                {clientDuesTillToday.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/20 backdrop-blur-sm rounded-lg p-3 hover:bg-white/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{item.clientName}</span>
                      <span className="text-white font-black text-lg">₹{formatIndianNumber(item.totalDue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showIncomeBreakdown && clientIncomeBreakdown.length > 0 && (
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-5 mb-6">
            <div className="space-y-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Income by Client</h3>
                  <button
                    onClick={() => deleteTodayRecords()}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-105 flex items-center gap-2 text-xs font-bold text-white shadow-lg"
                    title="Delete ALL today's records"
                  >
                    <AlertTriangle size={14} />
                    Delete All Today
                  </button>
                </div>
                <div className="space-y-2">
                  {clientIncomeBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{item.clientName}</p>
                        <p className="text-xs text-green-100">{formatIndianNumber(item.members)} members × ₹{item.rate}/member</p>
                        {item.adjustments && item.adjustments !== 0 && (
                          <p className="text-xs text-yellow-200 italic mt-1">
                            + ₹{formatIndianNumber(item.adjustments)} (adjustment)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {item.adjustments && item.adjustments !== 0 ? (
                            <>
                              <p className="text-xs text-green-200 line-through">₹{formatIndianNumber(item.income)}</p>
                              <p className="text-lg font-black text-white">₹{formatIndianNumber(item.total || item.income)}</p>
                            </>
                          ) : (
                            <p className="text-lg font-black text-white">₹{formatIndianNumber(item.income)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTodayRecords(item.clientName)}
                          className="bg-red-500/80 hover:bg-red-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
                          title={`Delete today's records for ${item.clientName}`}
                        >
                          <Trash2 size={16} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Manual Income Section */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Manual Income Entries</h3>
                    <button
                      onClick={() => {
                        setManualIncomeDate(selectedDate);
                        setShowAddManualIncome(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-all duration-300 hover:scale-105 flex items-center gap-2 text-xs font-bold text-white shadow-lg"
                    >
                      <Plus size={14} />
                      Add Manual Income
                    </button>
                  </div>
                  <div className="space-y-2">
                    {manualIncomeEntries.length === 0 ? (
                      <p className="text-xs text-green-100 italic text-center py-2">No manual income entries for this date</p>
                    ) : (
                      manualIncomeEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                          {editingManualIncome === entry.id ? (
                            <>
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="number"
                                  value={editManualAmount}
                                  onChange={(e) => setEditManualAmount(e.target.value)}
                                  className="w-32 px-2 py-1 rounded bg-white/20 text-white text-sm"
                                  placeholder="Amount"
                                />
                                <input
                                  type="text"
                                  value={editManualDescription}
                                  onChange={(e) => setEditManualDescription(e.target.value)}
                                  className="flex-1 px-2 py-1 rounded bg-white/20 text-white text-sm"
                                  placeholder="Description"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateManualIncome(entry.id, editManualAmount, editManualDescription)}
                                  className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs text-white"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingManualIncome(null)}
                                  className="bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded text-xs text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-white">{entry.description}</p>
                                <p className="text-xs text-green-100">{new Date(entry.created_at).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-lg font-black text-yellow-300">₹{formatIndianNumber(entry.amount)}</p>
                                <button
                                  onClick={() => {
                                    setEditingManualIncome(entry.id);
                                    setEditManualAmount(entry.amount.toString());
                                    setEditManualDescription(entry.description);
                                  }}
                                  className="bg-blue-500/80 hover:bg-blue-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                                    <path d="m15 5 4 4"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteManualIncome(entry.id)}
                                  className="bg-red-500/80 hover:bg-red-600 p-2 rounded-lg transition-all duration-300 hover:scale-110"
                                  title="Delete"
                                >
                                  <Trash2 size={16} className="text-white" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {manualIncomeEntries.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                      <p className="text-xs text-green-100 font-semibold">Total Manual Income:</p>
                      <p className="text-lg font-black text-yellow-300">
                        ₹{formatIndianNumber(manualIncomeEntries.reduce((sum, e) => sum + Number(e.amount), 0))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`mb-6 p-6 rounded-2xl shadow-lg ${
          isDark
            ? 'bg-gradient-to-br from-slate-800 via-gray-800 to-slate-800 border border-gray-700'
            : 'bg-gradient-to-br from-white via-blue-50 to-white border border-blue-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchMeetingId}
                onChange={(e) => setSearchMeetingId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchMeeting();
                  }
                }}
                placeholder="Search by Meeting ID or Name..."
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
                  isDark
                    ? 'bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50'
                    : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50'
                }`}
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            <button
              onClick={handleSearchMeeting}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              Search
            </button>
            {showSearchResults && (
              <button
                onClick={() => {
                  setShowSearchResults(false);
                  setSearchResults([]);
                  setSearchMeetingId('');
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className={`mt-4 p-4 rounded-xl ${
              isDark ? 'bg-gray-700/50' : 'bg-blue-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Search Results ({searchResults.length})
                </h3>
                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Total Members: <span className="font-bold text-blue-600">{formatIndianNumber(searchResults.reduce((sum, m) => sum + (m.member_count || 0), 0))}</span>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {searchResults.map((meeting) => (
                  <div
                    key={meeting.id}
                    className={`p-4 rounded-lg transition-all ${
                      isDark
                        ? 'bg-gray-800 border border-gray-600'
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {meeting.meeting_name}
                      </h4>
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        meeting.status === 'not_live'
                          ? 'bg-red-100 text-red-700'
                          : meeting.screenshot_url
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {meeting.status === 'not_live' ? 'Not Live' : meeting.screenshot_url ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date:</span>
                          <span className={`ml-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            {new Date(meeting.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Time:</span>
                          <span className={`ml-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            {meeting.hour}:{String(meeting.minutes).padStart(2, '0')} {meeting.time_period}
                          </span>
                        </div>
                        <div>
                          <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Client:</span>
                          <span className={`ml-2 font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {meeting.client_name || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Members:</span>
                          <span className={`ml-2 font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {formatIndianNumber(meeting.member_count || 0)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Type:</span>
                          <span className={`ml-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            {meeting.member_type === 'foreigners' ? 'Foreigner/DP' : 'Indian'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                        <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                          <div className="flex-1">
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Meeting ID</span>
                            <div className={`font-mono font-bold text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {meeting.meeting_id}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(meeting.meeting_id);
                              alert('Meeting ID copied!');
                            }}
                            className="ml-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-md"
                            title="Copy Meeting ID"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                            </svg>
                            Copy
                          </button>
                        </div>

                        <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                          <div className="flex-1">
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password</span>
                            <div className={`font-mono font-bold text-base mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {meeting.password}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(meeting.password);
                              alert('Password copied!');
                            }}
                            className="ml-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-md"
                            title="Copy Password"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                              <path d="M4 16c-1.1 0-2-.9-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                            </svg>
                            Copy
                          </button>
                        </div>
                      </div>

                      {!meeting.screenshot_url && meeting.status !== 'not_live' && (
                        <button
                          onClick={() => {
                            setSelectedMeetingForScreenshot(meeting.id);
                            setPastedImage(null);
                          }}
                          className={`mt-3 w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-md transition-all ${
                            isDark
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          <ImageIcon size={12} />
                          Upload
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : new Date(selectedDate).toLocaleDateString()}
              <span className={`ml-2 text-lg font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                ({filteredMeetings.length} meetings)
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDate}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md hover:shadow-lg hover:scale-110"
                title="Previous Day"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md hover:shadow-lg hover:scale-110"
                  title="Select Date"
                >
                  <Calendar size={20} />
                </button>
                {showDatePicker && (
                  <div className={`absolute top-12 left-0 rounded-lg shadow-2xl p-4 border-2 z-50 ${
                    isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  }`}>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setShowDatePicker(false);
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      className={`px-4 py-2 border-2 rounded-lg focus:border-blue-500 outline-none ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                )}
              </div>
              {!isToday() && (
                <button
                  onClick={goToNextDate}
                  className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-md hover:shadow-lg hover:scale-110"
                  title="Next Day"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              )}
              <button
                onClick={async () => {
                  setIsLoadingMeetings(true);
                  await Promise.all([fetchMeetings(), fetchManualIncome(selectedDate)]);
                  setIsLoadingMeetings(false);
                }}
                disabled={isLoadingMeetings}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:bg-gray-400 text-white font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                title="Fetch Records"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                {isLoadingMeetings ? 'Loading...' : 'Fetch Records'}
              </button>
              <button
                onClick={async () => {
                  setShowCustomEntryModal(true);
                  const { data } = await supabase.from('users').select('id, name').eq('role', 'client');
                  if (data) setAllUsers(data);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                title="Add Custom Meeting Entry"
              >
                <Plus size={16} />
                Custom Entry
              </button>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all shadow-md ${
                  isDark
                    ? 'bg-gray-700 text-white border border-gray-600'
                    : 'bg-white text-gray-900 border border-gray-300'
                }`}
                title="Filter by Time"
              >
                <option value="all">All Times</option>
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              <button
                onClick={handleOpenAllMeetings}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-1"
                title="Open All Live Meetings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Open All
              </button>
            </div>
          </div>

        </div>

        {instantMeetings.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
              <Zap size={20} />
              Instant Meetings ({instantMeetings.length})
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {instantMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} isInstant={true} />
              ))}
            </div>
          </div>
        )}

        {regularMeetings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {regularMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-200">
            <Video size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold text-gray-700">
              No regular meetings yet
            </p>
          </div>
        )}
      </div>

      {selectedScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className={`rounded-2xl p-4 max-w-4xl max-h-[90vh] overflow-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <img
              src={selectedScreenshot}
              alt="Meeting screenshot"
              className="w-full h-auto rounded-xl"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EScreenshot not available%3C/text%3E%3C/svg%3E';
              }}
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

      {selectedMeetingForScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Upload Screenshot
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Press <kbd className={`px-2 py-1 rounded font-mono text-xs ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-900'}`}>Ctrl+V</kbd> (or <kbd className={`px-2 py-1 rounded font-mono text-xs ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-900'}`}>Cmd+V</kbd> on Mac) to paste a screenshot
            </p>

            {pastedImage ? (
              <div>
                <img
                  src={pastedImage}
                  alt="Pasted screenshot"
                  className="w-full rounded-xl border-2 border-gray-200 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={uploadScreenshot}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    Upload Screenshot
                  </button>
                  <button
                    onClick={() => setPastedImage(null)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className={`border-2 border-dashed rounded-xl p-12 text-center ${isDark ? 'border-gray-600 bg-gray-700/30' : 'border-gray-300 bg-gray-50'}`}>
                <ImageIcon size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Waiting for paste...</p>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedMeetingForScreenshot(null);
                setPastedImage(null);
              }}
              className={`mt-4 w-full font-bold py-2 px-4 rounded-xl transition-all ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showPayments && (
        <div className={`rounded-2xl shadow-xl p-4 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Client Payments</h2>
          {payments.filter(p => p.status === 'pending' || p.status === 'approved').length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No payments received yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Client</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Upto</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Status</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.filter(p => p.status === 'pending' || p.status === 'approved').map(payment => (
                    <tr key={payment.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                      payment.status === 'pending' ? 'bg-amber-50' : payment.status === 'approved' ? 'bg-green-50' : ''
                    }`}>
                      <td className="py-2 px-3 font-medium text-gray-900">{payment.client_name}</td>
                      <td className="py-2 px-3 font-bold text-gray-900">₹{formatIndianNumber(payment.amount)}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {payment.payment_upto_date ? new Date(payment.payment_upto_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                          payment.status === 'approved' ? 'bg-green-200 text-green-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {payment.status || 'pending'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => window.open(payment.screenshot_url, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition-all"
                            title="View Screenshot"
                          >
                            <Eye size={14} />
                          </button>
                          {payment.status === 'pending' && (
                            <>
                              <button
                                onClick={async () => {
                                  const { error } = await supabase
                                    .from('payments')
                                    .update({ status: 'approved', approved_by: 'admin', approved_at: new Date().toISOString() })
                                    .eq('id', payment.id);
                                  if (!error) {
                                    await supabase.from('notifications').insert({
                                      user_id: payment.user_id,
                                      message: `Your payment of ₹${formatIndianNumber(payment.amount)} has been approved and adjusted to your dues.`,
                                      type: 'success',
                                      is_read: false,
                                      metadata: { payment_id: payment.id, amount: payment.amount }
                                    });

                                    setPayments(prev => prev.map(p =>
                                      p.id === payment.id
                                        ? { ...p, status: 'approved', approved_by: 'admin', approved_at: new Date().toISOString() }
                                        : p
                                    ));

                                    alert('Payment approved!');
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded transition-all"
                                title="Approve"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingPayment(payment);
                                  setRejectionAmount(payment.amount.toString());
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded transition-all"
                                title="Reject"
                              >
                                <span className="text-xs font-bold">✕</span>
                              </button>
                            </>
                          )}
                          {payment.status === 'pending' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this payment? This will permanently remove it without notifying the client.')) {
                                  const { error } = await supabase
                                    .from('payments')
                                    .delete()
                                    .eq('id', payment.id);
                                  if (!error) {
                                    setPayments(prev => prev.filter(p => p.id !== payment.id));
                                    alert('Payment deleted!');
                                  } else {
                                    alert('Error: ' + error.message);
                                  }
                                }
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white p-1.5 rounded transition-all"
                              title="Delete Payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showPaymentSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Payment Settings
            </h3>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {isPaymentSettingsLocked && !isEditingPaymentSettings && (
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 rounded-full p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-900">Payment Settings Saved</p>
                      <p className="text-xs text-green-700">Your payment methods are configured and active</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingPaymentSettings(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Modify
                  </button>
                </div>
              )}

              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  UPI Payment
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={isPaymentSettingsLocked && !isEditingPaymentSettings}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all ${isPaymentSettingsLocked && !isEditingPaymentSettings ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="your-upi-id@bank"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      UPI QR Code
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isPaymentSettingsLocked && !isEditingPaymentSettings}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleQrCodeUpload(e.target.files[0], 'upi');
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all ${isPaymentSettingsLocked && !isEditingPaymentSettings ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {upiQrUrl && (
                      <div className="mt-2">
                        <img src={upiQrUrl} alt="UPI QR Code" className="w-32 h-32 object-contain border-2 border-orange-300 rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  USDT TRC20 (TRON Network)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TRC20 Wallet Address
                    </label>
                    <input
                      type="text"
                      value={trc20Address}
                      onChange={(e) => setTrc20Address(e.target.value)}
                      disabled={isPaymentSettingsLocked && !isEditingPaymentSettings}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all font-mono text-sm ${isPaymentSettingsLocked && !isEditingPaymentSettings ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Enter TRC20 wallet address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      TRC20 QR Code
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isPaymentSettingsLocked && !isEditingPaymentSettings}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleQrCodeUpload(e.target.files[0], 'trc20');
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all ${isPaymentSettingsLocked && !isEditingPaymentSettings ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {trc20QrUrl && (
                      <div className="mt-2">
                        <img src={trc20QrUrl} alt="TRC20 QR Code" className="w-32 h-32 object-contain border-2 border-green-300 rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                  USDT BEP20 (Binance Smart Chain)
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      BEP20 Wallet Address
                    </label>
                    <input
                      type="text"
                      value={bep20Address}
                      onChange={(e) => setBep20Address(e.target.value)}
                      disabled={isPaymentSettingsLocked && !isEditingPaymentSettings}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all font-mono text-sm ${isPaymentSettingsLocked && !isEditingPaymentSettings ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Enter BEP20 wallet address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      BEP20 QR Code
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isPaymentSettingsLocked && !isEditingPaymentSettings}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleQrCodeUpload(e.target.files[0], 'bep20');
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all ${isPaymentSettingsLocked && !isEditingPaymentSettings ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                    {bep20QrUrl && (
                      <div className="mt-2">
                        <img src={bep20QrUrl} alt="BEP20 QR Code" className="w-32 h-32 object-contain border-2 border-yellow-300 rounded-lg" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(!isPaymentSettingsLocked || isEditingPaymentSettings) && (
                <div className="flex gap-3">
                  <button
                    onClick={updatePaymentMethods}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  >
                    {isEditingPaymentSettings ? 'Update' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      if (isEditingPaymentSettings) {
                        setIsEditingPaymentSettings(false);
                        fetchPaymentMethods();
                      } else {
                        setShowPaymentSettings(false);
                      }
                    }}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {isPaymentSettingsLocked && !isEditingPaymentSettings && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPaymentSettings(false)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed top-20 right-4 z-50 w-96 max-h-[600px] bg-white rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] border-2 border-cyan-300 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-white" style={{fontFamily: 'EDOSZ, monospace'}}>
              🔔 NOTIFICATIONS
            </h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[520px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">📭</p>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-gray-200 hover:bg-cyan-50 transition-all ${!notif.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-2 rounded-full mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <line x1="19" y1="8" x2="19" y2="14"></line>
                        <line x1="22" y1="11" x2="16" y2="11"></line>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 leading-relaxed">
                        <span className="font-black text-cyan-700" style={{fontFamily: 'EDOSZ, monospace'}}>{notif.clientName}</span>
                        {' '}has requested to add{' '}
                        <span className="font-bold text-blue-600">{formatIndianNumber(notif.memberCount)} members</span>
                        {' '}in{' '}
                        <span className="font-bold text-orange-600">{notif.meetingName}</span>
                        {' '}at{' '}
                        <span className="font-bold text-gray-700">{notif.time}</span>
                      </p>
                      {!notif.read && (
                        <span className="inline-block mt-1 text-xs text-blue-600 font-bold">● NEW</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={() => setNotifications([])}
                className="text-sm text-red-600 hover:text-red-700 font-bold"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {rejectingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Reject Payment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Client: <span className="font-bold">{rejectingPayment.client_name}</span><br/>
              Total Amount: <span className="font-bold">₹{formatIndianNumber(rejectingPayment.amount)}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount Not Received (₹) *
                </label>
                <input
                  type="number"
                  value={rejectionAmount}
                  onChange={(e) => setRejectionAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                  placeholder="Enter amount"
                  min="0"
                  max={rejectingPayment.amount}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This amount will be added back to client's net due
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const amount = parseFloat(rejectionAmount);
                    if (isNaN(amount) || amount <= 0) {
                      alert('Please enter a valid amount');
                      return;
                    }

                    await supabase.from('notifications').insert({
                      user_id: rejectingPayment.user_id,
                      message: `Your payment of ₹${formatIndianNumber(rejectingPayment.amount)} was rejected. ₹${formatIndianNumber(amount)} has been added back to your dues.`,
                      type: 'error',
                      is_read: false,
                      metadata: { payment_id: rejectingPayment.id, rejected_amount: amount, reason: 'Payment not received' }
                    });

                    const { error } = await supabase
                      .from('payments')
                      .delete()
                      .eq('id', rejectingPayment.id);

                    if (!error) {
                      setPayments(prev => prev.filter(p => p.id !== rejectingPayment.id));
                      setRejectingPayment(null);
                      setRejectionAmount('');
                      alert('Payment rejected and deleted!');
                    }
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Reject Payment
                </button>
                <button
                  onClick={() => {
                    setRejectingPayment(null);
                    setRejectionAmount('');
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Meeting Modal */}
      {deletingMeeting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Delete Meeting
            </h3>
            <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Meeting: <span className="font-bold">{deletingMeeting.meeting_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Select Delete Reason *
                </label>

                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    deleteReason === 'not_live'
                      ? 'border-amber-500 bg-amber-50'
                      : isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="deleteReason"
                      value="not_live"
                      checked={deleteReason === 'not_live'}
                      onChange={(e) => setDeleteReason(e.target.value as 'not_live' | 'permanent')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Not Live
                      </div>
                      <div className="text-xs text-gray-600">
                        Meeting status will be set to "not_live" - meeting data preserved
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    deleteReason === 'permanent'
                      ? 'border-red-500 bg-red-50'
                      : isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="deleteReason"
                      value="permanent"
                      checked={deleteReason === 'permanent'}
                      onChange={(e) => setDeleteReason(e.target.value as 'not_live' | 'permanent')}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Permanent Delete
                      </div>
                      <div className="text-xs text-gray-600">
                        Meeting will be deleted permanently from database
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (deleteReason === 'not_live') {
                      await markAsNotLive(deletingMeeting.id);
                    } else {
                      await deleteMeeting(deletingMeeting.id);
                    }
                    setDeletingMeeting(null);
                    setDeleteReason('not_live');
                  }}
                  className={`flex-1 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl ${
                    deleteReason === 'not_live'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {deleteReason === 'not_live' ? 'Mark Not Live' : 'Delete Permanently'}
                </button>
                <button
                  onClick={() => {
                    setDeletingMeeting(null);
                    setDeleteReason('not_live');
                  }}
                  className={`px-6 py-3 font-bold rounded-xl transition-all duration-300 ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Income Modal */}
      {showAddManualIncome && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Add Manual Income Entry
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add additional income for a specific date (adjustments, bonuses, etc.)
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={manualIncomeDate}
                  onChange={(e) => setManualIncomeDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  value={manualIncomeAmount}
                  onChange={(e) => setManualIncomeAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={manualIncomeDescription}
                  onChange={(e) => setManualIncomeDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addManualIncome}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Add Income
                </button>
                <button
                  onClick={() => {
                    setShowAddManualIncome(false);
                    setManualIncomeAmount('');
                    setManualIncomeDescription('');
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClientsOverview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white">Clients Overview</h2>
              <button
                onClick={() => setShowClientsOverview(false)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-all"
              >
                <X size={24} className="text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <ClientsOverview />
            </div>
          </div>
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
          </div>
        </div>
      )}

      {/* Floating Invoice Button */}
      <button
        onClick={async () => {
          setShowInvoiceModal(true);
          // Fetch all clients
          const { data } = await supabase.from('users').select('id, name').eq('role', 'client');
          if (data) setAllUsers(data);
        }}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-5 rounded-full shadow-[0_0_40px_rgba(34,197,94,0.6)] hover:shadow-[0_0_60px_rgba(34,197,94,0.8)] transition-all duration-300 hover:scale-110 z-40"
        title="Generate Invoice"
      >
        <FileText size={28} strokeWidth={2.5} />
      </button>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-2xl max-w-2xl w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`} style={{fontFamily: 'EDOSZ, monospace'}}>
                📄 GENERATE INVOICE v2.0
              </h3>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedClientForInvoice(null);
                  setInvoiceFromDate('');
                }}
                className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X size={24} />
              </button>
            </div>

            {!selectedClientForInvoice ? (
              <div>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Select client(s) to generate invoice
                </p>

                {/* Select All Option */}
                <button
                  onClick={() => {
                    const allClientIds = allUsers
                      .filter(u => u.name !== 'Junaid')
                      .map(c => c.id);
                    if (selectedClientsForInvoice.length === allClientIds.length) {
                      setSelectedClientsForInvoice([]);
                    } else {
                      setSelectedClientsForInvoice(allClientIds);
                    }
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all border-2 mb-3 font-bold ${
                    selectedClientsForInvoice.length === allUsers.filter(u => u.name !== 'Junaid').length
                      ? isDark
                        ? 'bg-teal-700 border-teal-500 text-white'
                        : 'bg-teal-100 border-teal-500 text-teal-900'
                      : isDark
                      ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-teal-500'
                      : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-teal-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">✓ Select All Clients</span>
                    {selectedClientsForInvoice.length > 0 && (
                      <span className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-teal-600' : 'bg-teal-200'}`}>
                        {selectedClientsForInvoice.length} selected
                      </span>
                    )}
                  </div>
                </button>

                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {allUsers.length === 0 ? (
                    <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p>Loading clients...</p>
                    </div>
                  ) : (
                    [...allUsers]
                      .filter(u => u.name !== 'Junaid')
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((client) => {
                        const isSelected = selectedClientsForInvoice.includes(client.id);
                        return (
                          <div key={client.id} className="flex gap-2">
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedClientsForInvoice(prev => prev.filter(id => id !== client.id));
                                } else {
                                  setSelectedClientsForInvoice(prev => [...prev, client.id]);
                                }
                              }}
                              className={`flex-1 text-left p-4 rounded-xl transition-all border-2 hover:scale-[1.02] cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-teal-700 border-teal-500'
                                    : 'bg-teal-50 border-teal-500'
                                  : isDark
                                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-cyan-500'
                                  : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-cyan-500'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {client.name}
                                </p>
                                {isSelected && <span className="text-teal-400">✓</span>}
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClientForInvoice({ id: client.id, name: client.name });
                                setUseAutoDateCalculation(true);
                              }}
                              className={`px-4 py-2 rounded-xl font-bold transition-all border-2 ${
                                isDark
                                  ? 'bg-blue-600 border-blue-500 hover:bg-blue-700 text-white'
                                  : 'bg-blue-500 border-blue-400 hover:bg-blue-600 text-white'
                              }`}
                              title="Quick Invoice"
                            >
                              📄
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>

                {selectedClientsForInvoice.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedClientForInvoice({ id: 'bulk', name: 'Multiple Clients' });
                    }}
                    disabled={isGeneratingBulkInvoices}
                    className="w-full mt-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-black py-4 px-6 rounded-xl transition-all disabled:opacity-50"
                  >
                    Continue with {selectedClientsForInvoice.length} Client{selectedClientsForInvoice.length > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedClientForInvoice.id === 'bulk'
                      ? `${selectedClientsForInvoice.length} Client${selectedClientsForInvoice.length > 1 ? 's' : ''} Selected`
                      : 'Selected Client'
                    }
                  </p>
                  <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`} style={{fontFamily: 'EDOSZ, monospace'}}>
                    {selectedClientForInvoice.id === 'bulk'
                      ? allUsers.filter(u => selectedClientsForInvoice.includes(u.id)).map(u => u.name).slice(0, 3).join(', ') + (selectedClientsForInvoice.length > 3 ? '...' : '')
                      : selectedClientForInvoice.name
                    }
                  </p>
                </div>

                {selectedClientForInvoice.id === 'bulk' && (
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-teal-900/30 border border-teal-700' : 'bg-teal-50 border border-teal-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>
                      📄 Bulk Mode: Each client will get a separate PDF invoice auto-dated from their last payment to today
                    </p>
                  </div>
                )}

                {selectedClientForInvoice.id !== 'bulk' && (
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        const { data: lastPayment } = await supabase
                          .from('payments')
                          .select('payment_date')
                          .eq('client_name', selectedClientForInvoice.name)
                          .eq('status', 'approved')
                          .order('payment_date', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        if (lastPayment?.payment_date) {
                          const nextDay = new Date(lastPayment.payment_date);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setInvoiceFromDate(nextDay.toISOString().split('T')[0]);
                          setInvoiceToDate(new Date().toISOString().split('T')[0]);
                        } else {
                          const { data: firstMeeting } = await supabase
                            .from('meetings')
                            .select('scheduled_date')
                            .eq('client_name', selectedClientForInvoice.name)
                            .order('scheduled_date', { ascending: true })
                            .limit(1)
                            .maybeSingle();

                          if (firstMeeting?.scheduled_date) {
                            setInvoiceFromDate(firstMeeting.scheduled_date);
                            setInvoiceToDate(new Date().toISOString().split('T')[0]);
                          } else {
                            alert('No meetings found for this client');
                          }
                        }
                      }}
                      className={`w-full py-2 px-4 rounded-lg font-bold text-sm transition-all ${
                        isDark
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      }`}
                    >
                      Auto Calculate (From Last Payment to Today)
                    </button>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        From Date
                      </label>
                      <input
                        type="date"
                        value={invoiceFromDate}
                        onChange={(e) => setInvoiceFromDate(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border-2 outline-none transition-all ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400'
                            : 'bg-white border-gray-300 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        To Date
                      </label>
                      <input
                        type="date"
                        value={invoiceToDate}
                        onChange={(e) => setInvoiceToDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 rounded-lg border-2 outline-none transition-all ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400'
                            : 'bg-white border-gray-300 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setSelectedClientForInvoice(null);
                      setInvoiceFromDate('');
                      if (selectedClientForInvoice.id === 'bulk') {
                        setSelectedClientsForInvoice([]);
                      }
                    }}
                    disabled={isGeneratingBulkInvoices}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all disabled:opacity-50 ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      if (!invoiceFromDate || !invoiceToDate) {
                        alert('Please select both from and to dates');
                        return;
                      }

                      if (selectedClientForInvoice.id === 'bulk') {
                        setIsGeneratingBulkInvoices(true);
                        try {
                          const { generateClientInvoicePDF } = await import('../utils/pdfGenerator');

                          let successCount = 0;
                          const clients = allUsers.filter(u => selectedClientsForInvoice.includes(u.id));

                          for (const client of clients) {
                            try {
                              console.log(`Processing invoice for client: ${client.name}`);

                              const { data: lastPayment } = await supabase
                                .from('payments')
                                .select('payment_date')
                                .eq('client_name', client.name)
                                .eq('status', 'approved')
                                .order('payment_date', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                              let fromDate: string;
                              if (lastPayment?.payment_date) {
                                fromDate = new Date(new Date(lastPayment.payment_date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                              } else {
                                const { data: firstMeeting } = await supabase
                                  .from('meetings')
                                  .select('scheduled_date')
                                  .eq('client_name', client.name)
                                  .order('scheduled_date', { ascending: true })
                                  .limit(1)
                                  .maybeSingle();

                                fromDate = firstMeeting?.scheduled_date || '2024-01-01';
                              }
                              const toDate = new Date().toISOString().split('T')[0];

                              console.log(`Date range for ${client.name}: ${fromDate} to ${toDate}`);

                              const { data: meetingsData } = await supabase
                                .from('meetings')
                                .select('*')
                                .eq('client_name', client.name)
                                .neq('status', 'not_live')
                                .gte('scheduled_date', fromDate)
                                .lte('scheduled_date', toDate)
                                .order('scheduled_date', { ascending: true });

                              const validMeetings = meetingsData?.filter(m =>
                                m.screenshot_url && m.screenshot_url.trim() !== '' && m.attended
                              ) || [];

                              console.log(`${client.name}: Found ${meetingsData?.length || 0} total meetings, ${validMeetings.length} valid (attended with screenshots)`);

                              const { data: adjustmentsData } = await supabase
                                .from('due_adjustments')
                                .select('*')
                                .eq('client_name', client.name)
                                .gte('date', fromDate)
                                .lte('date', toDate);

                              const { data: lastInvoice } = await supabase
                                .from('invoices')
                                .select('invoice_number')
                                .eq('client_name', client.name)
                                .order('invoice_number', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                              const nextInvoiceNumber = lastInvoice ? lastInvoice.invoice_number + 1 : 1;

                              const { data: clientData } = await supabase
                                .from('users')
                                .select('price_per_member, price_per_dp_member, foreign_member_rate')
                                .eq('id', client.id)
                                .maybeSingle();

                              const clientRate = Number(clientData?.price_per_member) || 0;
                              const dpRate = Number(clientData?.price_per_dp_member) || 240;
                              const foreignRate = Number(clientData?.foreign_member_rate) || clientRate;

                              const meetings = validMeetings.map(m => {
                                let rateToUse = clientRate;
                                if (m.member_type === 'dp') rateToUse = dpRate;
                                else if (m.member_type === 'foreigners') rateToUse = foreignRate;

                                const amount = (m.member_count || 0) * rateToUse;
                                return {
                                  date: m.scheduled_date || m.created_at,
                                  meetingName: m.meeting_name,
                                  members: m.member_count || 0,
                                  memberType: m.member_type || 'indian',
                                  rate: rateToUse,
                                  amount: amount
                                };
                              });

                              const adjustments = adjustmentsData?.map(adj => ({
                                date: adj.date,
                                reason: adj.reason,
                                amount: adj.amount
                              })) || [];

                              const subtotal = meetings.reduce((sum, m) => sum + m.amount, 0);
                              const adjustmentTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
                              const netAmount = subtotal + adjustmentTotal;

                              console.log(`${client.name}: Subtotal=${subtotal}, Adjustments=${adjustmentTotal}, Net=${netAmount}`);

                              if (netAmount > 0) {
                                console.log(`✓ Generating PDF for ${client.name}`);
                                generateClientInvoicePDF({
                                  invoiceNumber: nextInvoiceNumber,
                                  clientName: client.name,
                                  fromDate,
                                  toDate,
                                  invoiceDate: new Date().toISOString(),
                                  meetings,
                                  adjustments,
                                  totalMeetings: meetings.length,
                                  totalMembers: meetings.reduce((sum, m) => sum + m.members, 0),
                                  subtotal,
                                  adjustmentTotal,
                                  netAmount,
                                  lastPaymentDate: lastPayment?.payment_date
                                });

                                await supabase.from('invoices').insert([{
                                  invoice_number: nextInvoiceNumber,
                                  client_id: client.id,
                                  client_name: client.name,
                                  from_date: fromDate,
                                  to_date: toDate,
                                  total_amount: netAmount
                                }]);

                                successCount++;
                                await new Promise(resolve => setTimeout(resolve, 500));
                              } else {
                                console.log(`✗ Skipped ${client.name}: netAmount is ${netAmount}`);
                              }
                            } catch (error) {
                              console.error(`✗ Error generating invoice for ${client.name}:`, error);
                            }
                          }

                          console.log(`\n🎉 Bulk generation complete: ${successCount} invoice(s) generated!`);
                          alert(`Successfully generated ${successCount} invoice(s)!`);
                          setShowInvoiceModal(false);
                          setSelectedClientForInvoice(null);
                          setSelectedClientsForInvoice([]);
                        } catch (error: any) {
                          console.error('Error generating bulk invoices:', error);
                          alert('Error generating bulk invoices: ' + error.message);
                        } finally {
                          setIsGeneratingBulkInvoices(false);
                        }
                        return;
                      }

                      if (!selectedClientForInvoice) {
                        alert('Please select a client');
                        return;
                      }

                      try {
                        const { data: meetingsData, error: meetingsError } = await supabase
                          .from('meetings')
                          .select('*')
                          .eq('client_name', selectedClientForInvoice.name)
                          .gte('scheduled_date', invoiceFromDate)
                          .lte('scheduled_date', invoiceToDate)
                          .order('scheduled_date', { ascending: true });

                        if (meetingsError) throw meetingsError;

                        const validMeetings = meetingsData || [];

                        console.log('DEBUG: Fetched meetings count:', validMeetings.length);
                        if (validMeetings.length > 0) {
                          console.log('DEBUG: First meeting:', validMeetings[0]);
                        }

                        const { data: lastPayment } = await supabase
                          .from('payments')
                          .select('payment_date')
                          .eq('client_name', selectedClientForInvoice.name)
                          .eq('status', 'approved')
                          .order('payment_date', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        const { data: lastInvoice } = await supabase
                          .from('invoices')
                          .select('invoice_number')
                          .eq('client_name', selectedClientForInvoice.name)
                          .order('invoice_number', { ascending: false })
                          .limit(1)
                          .maybeSingle();

                        const nextInvoiceNumber = lastInvoice ? lastInvoice.invoice_number + 1 : 1;

                        const { data: clientData } = await supabase
                          .from('users')
                          .select('price_per_member, price_per_dp_member')
                          .eq('id', selectedClientForInvoice.id)
                          .maybeSingle();

                        const clientRate = Number(clientData?.price_per_member) || 0;
                        const dpRate = Number(clientData?.price_per_dp_member) || 240;

                        console.log('DEBUG: Client rates - Regular:', clientRate, 'DP:', dpRate);

                        const meetings = validMeetings.map(m => {
                          let rateToUse = clientRate;
                          if (m.member_type === 'dp') rateToUse = dpRate;
                          else if (m.member_type === 'foreigners') rateToUse = clientRate;

                          const amount = (m.member_count || 0) * rateToUse;
                          return {
                            date: m.scheduled_date || m.created_at,
                            meetingName: m.meeting_name,
                            members: m.member_count || 0,
                            memberType: m.member_type || 'indian',
                            rate: rateToUse,
                            amount: amount
                          };
                        });

                        const subtotal = meetings.reduce((sum, m) => sum + m.amount, 0);

                        console.log('DEBUG: Total meetings:', meetings.length, 'Subtotal:', subtotal);

                        if (meetings.length === 0 || subtotal <= 0) {
                          alert('No meetings found in the selected date range.');
                          return;
                        }

                        const { generateClientInvoicePDF } = await import('../utils/pdfGenerator');
                        generateClientInvoicePDF({
                          invoiceNumber: nextInvoiceNumber,
                          clientName: selectedClientForInvoice.name,
                          fromDate: invoiceFromDate,
                          toDate: invoiceToDate,
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

                        await supabase.from('invoices').insert([{
                          invoice_number: nextInvoiceNumber,
                          client_id: selectedClientForInvoice.id,
                          client_name: selectedClientForInvoice.name,
                          from_date: invoiceFromDate,
                          to_date: invoiceToDate,
                          total_amount: subtotal
                        }]);

                        // Close modal
                        setShowInvoiceModal(false);
                        setSelectedClientForInvoice(null);
                        setInvoiceFromDate('');
                      } catch (error: any) {
                        console.error('Error generating invoice:', error);
                        alert('Error generating invoice: ' + error.message);
                      }
                    }}
                    disabled={selectedClientForInvoice.id === 'bulk' ? isGeneratingBulkInvoices : (!invoiceFromDate || !invoiceToDate)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedClientForInvoice.id === 'bulk'
                      ? isGeneratingBulkInvoices
                        ? '⏳ Generating PDFs...'
                        : `📄 Generate ${selectedClientsForInvoice.length} Separate PDF${selectedClientsForInvoice.length > 1 ? 's' : ''}`
                      : 'Generate Invoice'
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showReplicateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
            isDark ? 'bg-gray-800 border-2 border-gray-600' : 'bg-white border-2 border-gray-200'
          }`}>
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-2xl font-black text-white">Replicate Previous Meetings</h3>
                  <p className="text-purple-100 text-sm mt-1">Select date and meetings to copy to today</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchYesterdayMeetings()}
                    disabled={isLoadingYesterdayMeetings}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Reload meetings"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isLoadingYesterdayMeetings ? 'animate-spin' : ''}
                    >
                      <path d="M21 2v6h-6"></path>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                      <path d="M3 22v-6h6"></path>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowReplicateModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                  <Calendar size={18} className="text-white" />
                  <input
                    type="date"
                    value={replicateDate}
                    max={(() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return yesterday.toISOString().split('T')[0];
                    })()}
                    onChange={(e) => {
                      setReplicateDate(e.target.value);
                      fetchYesterdayMeetings(e.target.value);
                    }}
                    className="bg-transparent text-white font-semibold outline-none cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    setReplicateDate(yesterdayStr);
                    fetchYesterdayMeetings(yesterdayStr);
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-semibold"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    const weekAgoStr = weekAgo.toISOString().split('T')[0];
                    setReplicateDate(weekAgoStr);
                    fetchYesterdayMeetings(weekAgoStr);
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all text-sm font-semibold"
                >
                  Last Week
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {isLoadingYesterdayMeetings ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
                  <p className={`text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Loading meetings...
                  </p>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Fetching data for {new Date(replicateDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              ) : yesterdayMeetings.length === 0 ? (
                <div className="text-center py-16">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-400">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <p className={`text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    No meetings found
                  </p>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No meetings found for {new Date(replicateDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                    <div>
                      <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {yesterdayMeetings.length} meetings found
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedMeetingsToReplicate.size} selected
                      </p>
                    </div>
                    <button
                      onClick={toggleSelectAll}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      {selectedMeetingsToReplicate.size === yesterdayMeetings.length ? (
                        <>
                          <CheckCircle size={18} />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={18} />
                          Select All
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {yesterdayMeetings.map((meeting) => {
                      const isSelected = selectedMeetingsToReplicate.has(meeting.id);
                      return (
                        <div
                          key={meeting.id}
                          onClick={() => toggleMeetingSelection(meeting.id)}
                          className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 ${
                            isSelected
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400 dark:border-green-600 shadow-lg'
                              : isDark
                              ? 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:bg-gray-650'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center flex-shrink-0 mt-1">
                              {isSelected ? (
                                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                                  <Check size={16} className="text-white font-bold" strokeWidth={3} />
                                </div>
                              ) : (
                                <div className={`w-6 h-6 border-2 rounded-lg transition-all ${
                                  isDark ? 'border-gray-500' : 'border-gray-300'
                                }`}></div>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {meeting.meeting_name}
                                </h4>
                                {meeting.is_instant && (
                                  <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-md">
                                    INSTANT
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-2">
                                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="font-semibold">Client:</span> {meeting.client_name}
                                </div>
                                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="font-semibold">Members:</span> {formatIndianNumber(meeting.member_count || 0)}
                                </div>
                                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="font-semibold">ID:</span> {meeting.meeting_id}
                                </div>
                                <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="font-semibold">Time:</span> {meeting.hour || 0}:{String(meeting.minutes || 0).padStart(2, '0')} {meeting.time_period}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {meeting.member_type && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                                    meeting.member_type === 'foreigners'
                                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                      : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                  }`}>
                                    {meeting.member_type === 'foreigners' ? '🌍 Foreigners' : '🇮🇳 Indian'}
                                  </span>
                                )}
                                {meeting.screenshot_url && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                    Has Screenshot
                                  </span>
                                )}
                                {meeting.alreadyAddedToday && (
                                  <span className="px-3 py-1 text-xs font-bold rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md animate-pulse flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                    Already in Today's List
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className={`px-6 py-4 border-t-2 ${
              isDark ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReplicateModal(false)}
                  className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={replicateSelectedMeetings}
                  disabled={selectedMeetingsToReplicate.size === 0}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-black py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Replicate {selectedMeetingsToReplicate.size > 0 ? `${selectedMeetingsToReplicate.size} Meeting${selectedMeetingsToReplicate.size > 1 ? 's' : ''}` : 'Meetings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomEntryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className={`rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-gray-800 border-2 border-gray-600' : 'bg-white border-2 border-gray-200'
          }`}>
            <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white">Custom Meeting Entry</h3>
                <p className="text-blue-100 text-sm mt-1">Add or modify meeting records for any date</p>
              </div>
              <button
                onClick={() => setShowCustomEntryModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Client *
                  </label>
                  <select
                    value={customEntryClient}
                    onChange={(e) => setCustomEntryClient(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Choose Client</option>
                    {allUsers.filter(u => u.name).map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={customEntryDate}
                    onChange={(e) => setCustomEntryDate(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Meeting Name *
                </label>
                <input
                  type="text"
                  value={customEntryMeetingName}
                  onChange={(e) => setCustomEntryMeetingName(e.target.value)}
                  placeholder="e.g., Team Meeting"
                  className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Meeting ID *
                  </label>
                  <input
                    type="text"
                    value={customEntryMeetingId}
                    onChange={(e) => setCustomEntryMeetingId(e.target.value)}
                    placeholder="1234567890"
                    className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Password *
                  </label>
                  <input
                    type="text"
                    value={customEntryPassword}
                    onChange={(e) => setCustomEntryPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Time
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={customEntryHour}
                      onChange={(e) => setCustomEntryHour(Number(e.target.value))}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 outline-none ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      value={customEntryMinutes}
                      onChange={(e) => setCustomEntryMinutes(Number(e.target.value))}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 outline-none ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={customEntryTimePeriod}
                      onChange={(e) => setCustomEntryTimePeriod(e.target.value as 'AM' | 'PM')}
                      className={`px-3 py-2 rounded-lg border-2 outline-none ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Member Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customEntryMemberCount}
                    onChange={(e) => setCustomEntryMemberCount(Number(e.target.value))}
                    className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Member Type
                  </label>
                  <select
                    value={customEntryMemberType}
                    onChange={(e) => setCustomEntryMemberType(e.target.value as 'indian' | 'foreigners')}
                    className={`w-full px-4 py-2 rounded-lg border-2 outline-none ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="indian">Indian</option>
                    <option value="foreigners">Foreigners</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Screenshot (Optional)
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${
                    hoveredUploadBox === 'customEntry'
                      ? isDark
                        ? 'border-blue-400 bg-blue-500/10'
                        : 'border-blue-500 bg-blue-50'
                      : isDark
                      ? 'border-gray-600 bg-gray-700/50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                  onPaste={async (e) => {
                    const items = e.clipboardData?.items;
                    if (items) {
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                          const blob = items[i].getAsFile();
                          if (blob) {
                            setCustomEntryScreenshot(blob);
                          }
                        }
                      }
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHoveredUploadBox('customEntry');
                  }}
                  onDragLeave={() => setHoveredUploadBox(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setHoveredUploadBox(null);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('image/')) {
                      setCustomEntryScreenshot(file);
                    }
                  }}
                  tabIndex={0}
                >
                  <div className="text-center">
                    {customEntryScreenshot ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span className="font-bold">Screenshot Ready!</span>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {customEntryScreenshot.name}
                        </p>
                        <button
                          onClick={() => setCustomEntryScreenshot(null)}
                          className="text-red-500 hover:text-red-600 text-sm font-bold underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className={`text-4xl ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>📸</div>
                        <p className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Press Ctrl+V to paste screenshot
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          or drag & drop, or
                          <label className="text-blue-500 hover:text-blue-600 cursor-pointer underline ml-1">
                            browse
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setCustomEntryScreenshot(e.target.files?.[0] || null)}
                              className="hidden"
                            />
                          </label>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="customAttended"
                  checked={customEntryAttended}
                  onChange={(e) => setCustomEntryAttended(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="customAttended" className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mark as Attended
                </label>
              </div>
            </div>

            <div className={`px-6 py-4 border-t-2 ${
              isDark ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCustomEntryModal(false)}
                  className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomEntry}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-black py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Create Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
