import { useState } from 'react';
import { Plus, Calendar, Repeat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DailyMeetingRecurring } from './DailyMeetingRecurring';

interface ClientMeetingFormProps {
  user: any;
  isDark: boolean;
  onMeetingAdded: () => void;
  selectedDate: string;
}

export function ClientMeetingForm({ user, isDark, onMeetingAdded, selectedDate }: ClientMeetingFormProps) {
  const [meetingName, setMeetingName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [hour, setHour] = useState(8);
  const [minutes, setMinutes] = useState(0);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [memberCount, setMemberCount] = useState(1);
  const [memberType, setMemberType] = useState<'indian' | 'foreigners'>('indian');
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const inputClass = isDark
    ? 'w-full px-4 py-3 rounded-xl border-2 bg-gray-900 border-gray-600 text-white focus:border-slate-400 focus:ring-2 focus:ring-slate-500/30 outline-none transition-all placeholder-gray-500'
    : 'w-full px-4 py-3 rounded-xl border-2 bg-white border-gray-300 text-gray-900 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none transition-all';

  const labelClass = isDark ? 'block text-sm font-bold text-gray-200 mb-2' : 'block text-sm font-bold text-gray-700 mb-2';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetingName.trim() || !meetingId.trim() || !password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const cleanMeetingId = meetingId.replace(/\s/g, '');
    const cleanPassword = password.replace(/\s/g, '');

    const { error } = await supabase
      .from('meetings')
      .insert({
        meeting_name: meetingName,
        meeting_id: cleanMeetingId,
        password: cleanPassword,
        hour,
        minutes,
        time_period: timePeriod,
        member_count: memberCount,
        member_type: memberType,
        client_name: user?.name,
        client_id: user?.id,
        attended: false,
        scheduled_date: selectedDate,
        status: 'scheduled'
      });

    if (error) {
      alert('Error saving meeting: ' + error.message);
      return;
    }

    resetForm();
    onMeetingAdded();
  };

  const handleRecurringSubmit = async (recurringData: { endDate: string | null; noEndDate: boolean }) => {
    if (!meetingName.trim() || !meetingId.trim() || !password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const cleanMeetingId = meetingId.replace(/\s/g, '');
    const cleanPassword = password.replace(/\s/g, '');

    const { error } = await supabase
      .from('recurring_meeting_templates')
      .insert({
        client_id: user?.id,
        client_name: user?.name,
        meeting_name: meetingName,
        meeting_id: cleanMeetingId,
        password: cleanPassword,
        hour,
        minutes,
        time_period: timePeriod,
        member_count: memberCount,
        member_type: memberType,
        is_active: true
      });

    if (error) {
      alert('Error creating recurring meeting: ' + error.message);
      return;
    }

    alert('✅ Meeting added to daily recurring list!');
    setShowRecurringModal(false);
    resetForm();
    onMeetingAdded();
  };

  const resetForm = () => {
    setMeetingName('');
    setMeetingId('');
    setPassword('');
    setHour(8);
    setMinutes(0);
    setTimePeriod('PM');
    setMemberCount(1);
    setMemberType('indian');
  };

  return (
    <>
      <form onSubmit={handleSubmit} className={`rounded-2xl shadow-xl p-6 border-2 ${
        isDark
          ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Add New Meeting
        </h2>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Meeting Name</label>
            <input
              type="text"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              className={inputClass}
              placeholder="e.g., Team Standup"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Meeting ID</label>
              <input
                type="text"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                className={inputClass}
                placeholder="1234567890"
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Time</label>
              <div className="flex gap-2">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className={inputClass}
                >
                  {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className={inputClass}
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setTimePeriod('AM')}
                    className={`px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                      timePeriod === 'AM'
                        ? 'bg-slate-700 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimePeriod('PM')}
                    className={`px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                      timePeriod === 'PM'
                        ? 'bg-slate-700 text-white'
                        : isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Members</label>
              <input
                type="number"
                min="1"
                value={memberCount}
                onChange={(e) => setMemberCount(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Member Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMemberType('indian')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                  memberType === 'indian'
                    ? 'bg-slate-700 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Indian
              </button>
              <button
                type="button"
                onClick={() => setMemberType('foreigners')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                  memberType === 'foreigners'
                    ? 'bg-slate-700 text-white'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Foreign
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowRecurringModal(true)}
              className={`py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2 ${
                isDark
                  ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
              }`}
            >
              <Repeat size={18} />
              Mark as Daily
            </button>
            <button
              type="submit"
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Save Meeting
            </button>
          </div>
        </div>
      </form>

      {showRecurringModal && (
        <DailyMeetingRecurring
          isDark={isDark}
          onSubmit={handleRecurringSubmit}
          onCancel={() => setShowRecurringModal(false)}
        />
      )}
    </>
  );
}
