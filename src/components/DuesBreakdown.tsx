import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';
import { RupeeSymbol } from './RupeeSymbol';

interface DueEntry {
  date: string;
  amount: number;
  meeting_count?: number;
  total_members?: number;
}

interface DuesBreakdownProps {
  dues: DueEntry[];
  isDark: boolean;
  onDateClick: (date: string) => void;
}

export function DuesBreakdown({ dues, isDark, onDateClick }: DuesBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!dues || dues.length === 0) {
    return null;
  }

  const totalDue = dues.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden border ${
      isDark
        ? 'bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-6 flex items-center justify-between transition-all ${
          isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'
          }`}>
            <CalendarIcon size={24} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          </div>
          <div className="text-left">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Date-wise Breakdown
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {dues.length} days • Click dates to view details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Outstanding
            </p>
            <div className={`text-2xl font-bold flex items-center gap-1 ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              <RupeeSymbol size="xl" />
              {totalDue.toLocaleString('en-IN')}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
          ) : (
            <ChevronDown size={24} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
            {dues.map((due) => (
              <button
                key={due.date}
                onClick={() => onDateClick(due.date)}
                className={`w-full p-4 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-md ${
                  isDark
                    ? 'bg-gray-800/50 border-gray-700 hover:border-slate-600 hover:bg-gray-800'
                    : 'bg-gray-50 border-gray-200 hover:border-slate-400 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {new Date(due.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    {due.total_members !== undefined && (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {due.total_members} members • {due.meeting_count || 0} meetings
                      </p>
                    )}
                  </div>
                  <div className={`text-xl font-bold flex items-center gap-1 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    <RupeeSymbol size="lg" />
                    {Number(due.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
