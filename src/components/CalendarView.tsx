import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { RupeeSymbol } from './RupeeSymbol';

interface HistoricalMeeting {
  id: string;
  meeting_name: string;
  meeting_id: string;
  password: string;
  hour?: number;
  minutes?: number;
  time_period?: 'AM' | 'PM';
  member_count?: number;
  client_name: string;
  screenshot_url?: string;
  attended: boolean;
  meeting_date: string;
  created_at: string;
  client_id?: string;
}

interface CalendarViewProps {
  onClose: () => void;
  isDark?: boolean;
}

interface ClientData {
  name: string;
  meetings: HistoricalMeeting[];
  totalMembers: number;
  rate: number;
  totalAmount: number;
}

export function CalendarView({ onClose, isDark = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [clientsData, setClientsData] = useState<ClientData[]>([]);
  const [todayMeetingsCount, setTodayMeetingsCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [allMeetings, setAllMeetings] = useState<HistoricalMeeting[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllMeetings();
  }, [currentDate]);

  useEffect(() => {
    organizeByClient();
    calculateTodayMeetings();
  }, [allMeetings, selectedClient]);

  const fetchAllMeetings = async () => {
    await Promise.all([fetchHistoricalMeetings(), fetchTodayActiveMeetings()]);
  };

  const fetchTodayActiveMeetings = async () => {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { data: activeMeetings, error } = await supabase
      .from('meetings')
      .select('*')
      .neq('status', 'not_live')
      .or(`scheduled_date.eq.${today},and(scheduled_date.is.null,created_at.gte.${startOfDay},created_at.lte.${endOfDay})`)
      .order('created_at', { ascending: false });

    if (error || !activeMeetings) return;

    const todayActiveMeetings: HistoricalMeeting[] = activeMeetings.map(m => ({
      id: m.id,
      meeting_name: m.meeting_name,
      meeting_id: m.meeting_id,
      password: m.password,
      hour: m.hour,
      minutes: m.minutes,
      time_period: m.time_period,
      member_count: m.member_count || 0,
      client_name: m.client_name || 'Unknown',
      meeting_date: m.scheduled_date || today,
      attended: m.attended,
      screenshot_url: m.screenshot_url,
      created_at: m.created_at
    }));

    setAllMeetings(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const newMeetings = todayActiveMeetings.filter(m => !existingIds.has(m.id));
      return [...newMeetings, ...prev];
    });
  };

  const calculateTodayMeetings = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayMeetings = allMeetings.filter(m => {
      if (selectedClient === 'all') return m.meeting_date === today;
      return m.meeting_date === today && m.client_name === selectedClient;
    });
    setTodayMeetingsCount(todayMeetings.length);
  };

  const fetchHistoricalMeetings = async () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = endOfMonth.toISOString().split('T')[0];

    const [historicalResult, activeMeetingsResult] = await Promise.all([
      supabase
        .from('historical_meetings')
        .select('*')
        .gte('meeting_date', startDate)
        .lte('meeting_date', endDate)
        .order('meeting_date', { ascending: false }),
      supabase
        .from('meetings')
        .select('*')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .neq('status', 'not_live')
        .order('scheduled_date', { ascending: false })
    ]);

    const allMeetingsData: HistoricalMeeting[] = [];

    if (!historicalResult.error && historicalResult.data) {
      allMeetingsData.push(...historicalResult.data);
    }

    if (!activeMeetingsResult.error && activeMeetingsResult.data) {
      const activeMeetingsFormatted: HistoricalMeeting[] = activeMeetingsResult.data.map(m => ({
        id: m.id,
        meeting_name: m.meeting_name,
        meeting_id: m.meeting_id,
        password: m.password,
        hour: m.hour,
        minutes: m.minutes,
        time_period: m.time_period,
        member_count: m.member_count || 0,
        client_name: m.client_name || 'Unknown',
        meeting_date: m.scheduled_date,
        attended: m.attended,
        screenshot_url: m.screenshot_url,
        created_at: m.created_at,
        client_id: m.client_id
      }));
      allMeetingsData.push(...activeMeetingsFormatted);
    }

    setAllMeetings(allMeetingsData);
  };

  const organizeByClient = async () => {
    const { data: users } = await supabase
      .from('users')
      .select('name, price_per_member')
      .eq('role', 'client');

    if (!users) return;

    const clientsArray: ClientData[] = users.map(user => {
      const clientMeetings = allMeetings.filter(m => m.client_name === user.name);
      const totalMembers = clientMeetings.reduce((sum, m) => sum + (m.member_count || 0), 0);
      const rate = user.price_per_member || 0;
      const totalAmount = totalMembers * rate;

      return {
        name: user.name,
        meetings: clientMeetings,
        totalMembers,
        rate,
        totalAmount
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    setClientsData(clientsArray);
  };


  const generateClientInvoice = (clientData: ClientData) => {
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const meetings = clientData.meetings.map(m => ({
      name: m.meeting_name,
      members: m.member_count || 0,
      rate: clientData.rate,
      total: (m.member_count || 0) * clientData.rate
    }));

    generateInvoicePDF({
      clientName: clientData.name,
      date: monthYear,
      meetings,
      totalAmount: clientData.totalAmount
    });
  };

  const filteredMeetings = selectedClient === 'all'
    ? allMeetings
    : allMeetings.filter(m => m.client_name === selectedClient);

  const groupedByDate = filteredMeetings.reduce((acc, meeting) => {
    const date = meeting.meeting_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, HistoricalMeeting[]>);

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setCurrentDate(nextMonth);
    }
  };

  const canGoNext = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) <= new Date();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto ${
        isDark
          ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900'
          : 'bg-white'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Meeting Calendar
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className={`p-2 rounded-lg transition-all ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <ChevronLeft size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
              </button>
              <span className={`text-lg font-semibold min-w-[140px] text-center ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={goToNextMonth}
                disabled={!canGoNext}
                className={`p-2 rounded-lg transition-all ${
                  canGoNext
                    ? isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    : 'opacity-40 cursor-not-allowed'
                }`}
              >
                <ChevronRight size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div>
            <label className={`block text-sm font-bold mb-2 ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Select Client
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                isDark
                  ? 'bg-gray-900 border-gray-600 text-white focus:border-slate-400'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-slate-500'
              }`}
            >
              <option value="all">All Clients</option>
              {clientsData.map(client => (
                <option key={client.name} value={client.name}>{client.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`mb-6 rounded-2xl p-6 border-2 ${
          isDark
            ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700'
            : 'bg-gradient-to-r from-slate-50 to-gray-100 border-slate-200'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedClient === 'all' ? 'All Clients' : selectedClient}
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Today's Meetings: <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{todayMeetingsCount}</span>
              </p>
            </div>
            {selectedClient !== 'all' && clientsData.filter(c => c.name === selectedClient).map(client => (
              <button
                key={client.name}
                onClick={() => generateClientInvoice(client)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
              >
                <Download size={16} />
                Download Invoice
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {Object.entries(groupedByDate)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, meetings]) => {
              const clientData = clientsData.find(c => c.name === selectedClient);
              const rate = clientData?.rate || 0;
              const dayTotalMembers = meetings.reduce((sum, m) => sum + (m.member_count || 0), 0);
              const dayNetDue = dayTotalMembers * rate;
              const isExpanded = expandedDates.has(date);

              return (
            <div key={date} className={`border-2 rounded-2xl overflow-hidden ${
              isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <button
                onClick={() => toggleDateExpansion(date)}
                className={`w-full p-5 flex justify-between items-center transition-all ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isDark ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <span className="text-2xl">📅</span>
                  </div>
                  <div className="text-left">
                    <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {selectedClient !== 'all' && (
                  <div className={`text-right px-6 py-3 rounded-xl ${
                    isDark ? 'bg-gray-900' : 'bg-white'
                  }`}>
                    <p className={`text-sm mb-1 font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total: {dayTotalMembers} members
                    </p>
                    <div className={`text-2xl font-bold flex items-center gap-1 ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      <RupeeSymbol size="xl" />
                      {dayNetDue.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className={`border-t p-4 space-y-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  {meetings.map(meeting => (
                    <div key={meeting.id} className={`rounded-xl p-4 border ${
                      isDark
                        ? 'bg-gray-900/50 border-gray-700 hover:bg-gray-900'
                        : 'bg-white border-gray-300 hover:shadow-md'
                    } transition-all`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {meeting.meeting_name}
                          </p>
                          {selectedClient === 'all' && (
                            <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              Client: <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{meeting.client_name}</span>
                            </p>
                          )}
                          <div className={`flex gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            <span>
                              <span className="font-semibold">Members:</span> {meeting.member_count || 0}
                            </span>
                            <span>
                              <span className="font-semibold">ID:</span> {meeting.meeting_id}
                            </span>
                            {meeting.hour && (
                              <span>
                                <span className="font-semibold">Time:</span> {meeting.hour}:{String(meeting.minutes || 0).padStart(2, '0')} {meeting.time_period}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-4 py-2 rounded-full ${
                          meeting.attended
                            ? 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {meeting.attended ? '✓ Attended' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )})}

          {Object.keys(groupedByDate).length === 0 && (
            <div className="text-center py-16">
              <p className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No meetings found for this month
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
