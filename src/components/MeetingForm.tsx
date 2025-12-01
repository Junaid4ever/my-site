import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, CheckCircle, XCircle, Loader } from 'lucide-react';
import { validateZoomCredentials } from '../utils/zoomHelper';

interface MeetingFormProps {
  onMeetingAdded: () => void;
  isDark: boolean;
}

export function MeetingForm({ onMeetingAdded, isDark }: MeetingFormProps) {
  const [meetingName, setMeetingName] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [hour, setHour] = useState(8);
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [memberCount, setMemberCount] = useState(1);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const validateMeeting = async () => {
    if (!meetingId.trim() || !password.trim()) {
      alert('Please enter Meeting ID and Password first');
      return;
    }

    setValidating(true);
    setValidationResult(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    const result = validateZoomCredentials(meetingId, password);
    setValidationResult(result);
    setValidating(false);
  };

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
      .insert([
        {
          meeting_name: meetingName,
          meeting_id: cleanMeetingId,
          password: cleanPassword,
          hour: hour,
          time_period: timePeriod,
          member_count: memberCount,
          attended: false,
          is_valid: validationResult?.isValid,
          validation_message: validationResult?.message || ''
        }
      ]);

    if (error) {
      alert('Error saving meeting: ' + error.message);
      return;
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: null,
        message: `New meeting created: ${meetingName} at ${hour}:00 ${timePeriod}`,
        type: 'success'
      });

    setMeetingName('');
    setMeetingId('');
    setPassword('');
    setHour(8);
    setTimePeriod('PM');
    setMemberCount(1);
    setValidationResult(null);
    onMeetingAdded();
  };

  return (
    <form onSubmit={handleSubmit} className={`rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-3xl border ${
      isDark
        ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-gray-700/50'
        : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200/50'
    }`}>
      <h2 className={`text-xl font-bold mb-5 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Add New Meeting
      </h2>

      <div className="space-y-4">
        <div>
          <label className={`block text-xs font-semibold mb-2 tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Meeting Name
          </label>
          <input
            type="text"
            value={meetingName}
            onChange={(e) => setMeetingName(e.target.value)}
            className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all duration-300 ${
              isDark
                ? 'bg-gray-900/50 border-gray-700 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-600/20'
                : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400 focus:ring-2 focus:ring-gray-200'
            }`}
            placeholder="e.g., Team Standup"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-semibold mb-2 tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Meeting ID
            </label>
            <input
              type="text"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all duration-300 ${
                isDark
                  ? 'bg-gray-900/50 border-gray-700 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-600/20'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400 focus:ring-2 focus:ring-gray-200'
              }`}
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-2 tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all duration-300 ${
                isDark
                  ? 'bg-gray-900/50 border-gray-700 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-600/20'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400 focus:ring-2 focus:ring-gray-200'
              }`}
              placeholder="Password"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-semibold mb-2 tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Time
            </label>
            <div className="flex gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className={`flex-1 px-3 py-2.5 text-sm rounded-xl border outline-none transition-all duration-300 ${
                  isDark
                    ? 'bg-gray-900/50 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTimePeriod('AM')}
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                    timePeriod === 'AM'
                      ? 'bg-slate-800 text-white shadow-lg'
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
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                    timePeriod === 'PM'
                      ? 'bg-slate-800 text-white shadow-lg'
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
            <label className={`block text-xs font-semibold mb-2 tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Members
            </label>
            <input
              type="number"
              min="1"
              value={memberCount}
              onChange={(e) => setMemberCount(Number(e.target.value))}
              className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all duration-300 ${
                isDark
                  ? 'bg-gray-900/50 border-gray-700 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-600/20'
                  : 'bg-white border-gray-300 text-gray-900 focus:border-gray-400 focus:ring-2 focus:ring-gray-200'
              }`}
              placeholder="1"
            />
          </div>
        </div>

        {validationResult && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium transition-all duration-300 ${
              validationResult.isValid
                ? 'bg-green-900/20 text-green-400 border border-green-700/30'
                : 'bg-red-900/20 text-red-400 border border-red-700/30'
            }`}
          >
            {validationResult.isValid ? (
              <CheckCircle size={14} />
            ) : (
              <XCircle size={14} />
            )}
            <span>{validationResult.message}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={validateMeeting}
            disabled={validating || !meetingId.trim() || !password.trim()}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50'
                : 'bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-50'
            }`}
          >
            {validating ? (
              <>
                <Loader size={14} className="animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Validate
              </>
            )}
          </button>

          <button
            type="submit"
            className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={14} />
            Save Meeting
          </button>
        </div>
      </div>
    </form>
  );
}
