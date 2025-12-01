import { TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { RupeeSymbol } from './RupeeSymbol';

interface PaymentSummaryCardProps {
  totalDues: number;
  totalPaid: number;
  tillDate: string | null;
  isDark: boolean;
  currentMonth: string;
}

export function PaymentSummaryCard({ totalDues, totalPaid, tillDate, isDark, currentMonth }: PaymentSummaryCardProps) {
  const remaining = totalDues - totalPaid;
  const paidPercentage = totalDues > 0 ? (totalPaid / totalDues) * 100 : 0;

  return (
    <div className={`rounded-2xl shadow-xl p-6 border-2 ${
      isDark
        ? 'bg-gradient-to-br from-blue-900/30 via-gray-800 to-purple-900/30 border-blue-700/50'
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 border-blue-200'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-xl ${
          isDark ? 'bg-blue-900/40' : 'bg-blue-100'
        }`}>
          <TrendingUp size={28} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Payment Summary
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentMonth}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-gray-800/50' : 'bg-white'
        }`}>
          <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Dues
          </p>
          <div className={`text-xl font-bold flex items-center gap-1 ${
            isDark ? 'text-orange-400' : 'text-orange-600'
          }`}>
            <RupeeSymbol size="lg" />
            {totalDues.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-gray-800/50' : 'bg-white'
        }`}>
          <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Paid Till Date
          </p>
          <div className={`text-xl font-bold flex items-center gap-1 ${
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            <RupeeSymbol size="lg" />
            {totalPaid.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`p-4 rounded-xl ${
          isDark ? 'bg-gray-800/50' : 'bg-white'
        }`}>
          <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Remaining
          </p>
          <div className={`text-xl font-bold flex items-center gap-1 ${
            remaining > 0
              ? isDark ? 'text-red-400' : 'text-red-600'
              : isDark ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <RupeeSymbol size="lg" />
            {remaining.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl ${
        isDark ? 'bg-gray-800/50' : 'bg-gray-100'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Payment Progress
          </span>
          <span className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            {paidPercentage.toFixed(1)}%
          </span>
        </div>
        <div className={`w-full h-3 rounded-full overflow-hidden ${
          isDark ? 'bg-gray-700' : 'bg-gray-300'
        }`}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${Math.min(paidPercentage, 100)}%` }}
          />
        </div>
      </div>

      {tillDate && (
        <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${
          isDark ? 'bg-emerald-900/20 border border-emerald-700/30' : 'bg-emerald-50 border border-emerald-200'
        }`}>
          <Calendar size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            <span className="font-semibold">Settled till: </span>
            {new Date(tillDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      )}
    </div>
  );
}
