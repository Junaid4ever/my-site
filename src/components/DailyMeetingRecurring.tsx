import { useState } from 'react';
import { Calendar, Infinity, X } from 'lucide-react';

interface DailyMeetingRecurringProps {
  isDark: boolean;
  onSubmit: (data: {
    endDate: string | null;
    noEndDate: boolean;
  }) => void;
  onCancel: () => void;
}

export function DailyMeetingRecurring({ isDark, onSubmit, onCancel }: DailyMeetingRecurringProps) {
  const [noEndDate, setNoEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  const handleSubmit = () => {
    if (!noEndDate && !endDate) {
      alert('Please select an end date or mark as "No End Date"');
      return;
    }
    onSubmit({
      endDate: noEndDate ? null : endDate,
      noEndDate
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-md w-full p-6 ${
        isDark
          ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border border-gray-700'
          : 'bg-white border border-gray-200'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Schedule as Daily Recurring
          </h3>
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg transition-all ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'} />
          </button>
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${
            isDark
              ? 'bg-blue-900/20 border-blue-700/50 text-blue-200'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <p className="text-sm">
              This meeting will be automatically scheduled every day at the specified time.
            </p>
          </div>

          <div>
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              noEndDate
                ? isDark
                  ? 'bg-slate-700 border-slate-500'
                  : 'bg-slate-100 border-slate-400'
                : isDark
                ? 'bg-gray-800 border-gray-600 hover:border-gray-500'
                : 'bg-gray-50 border-gray-300 hover:border-gray-400'
            }`}>
              <input
                type="checkbox"
                checked={noEndDate}
                onChange={(e) => {
                  setNoEndDate(e.target.checked);
                  if (e.target.checked) setEndDate('');
                }}
                className="w-5 h-5 rounded accent-slate-600"
              />
              <div className="flex items-center gap-2">
                <Infinity size={20} className={isDark ? 'text-gray-300' : 'text-gray-700'} />
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  No End Date (Lifetime)
                </span>
              </div>
            </label>
          </div>

          {!noEndDate && (
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} />
                  Schedule Till Date
                </div>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${
                  isDark
                    ? 'bg-gray-900 border-gray-600 text-white focus:border-slate-400'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-slate-500'
                }`}
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Meeting will stop being scheduled after this date
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Confirm Daily Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
