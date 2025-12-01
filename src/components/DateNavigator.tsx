import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  isDark: boolean;
  showCalendar?: boolean;
  onToggleCalendar?: () => void;
}

export function DateNavigator({
  selectedDate,
  onDateChange,
  isDark,
  showCalendar = false,
  onToggleCalendar
}: DateNavigatorProps) {
  const goToPreviousDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    onDateChange(currentDate.toISOString().split('T')[0]);
  };

  const goToNextDate = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    const nextDate = currentDate.toISOString().split('T')[0];
    if (nextDate <= today) {
      onDateChange(nextDate);
    }
  };

  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  };

  const canGoNext = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const today = new Date().toISOString().split('T')[0];
    return currentDate.toISOString().split('T')[0] <= today;
  };

  return (
    <div className={`rounded-2xl shadow-lg p-6 border-2 ${
      isDark
        ? 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-slate-700'
        : 'bg-gradient-to-r from-white via-gray-50 to-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={goToPreviousDate}
          className={`p-3 rounded-xl transition-all hover:scale-110 ${
            isDark
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
          }`}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex-1 text-center">
          <p className={`text-sm font-semibold mb-1 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isToday() ? 'Today' : 'Selected Date'}
          </p>
          <div className={`text-2xl font-bold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            {new Date(selectedDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              weekday: 'long'
            })}
          </div>
        </div>

        {onToggleCalendar && (
          <button
            onClick={onToggleCalendar}
            className={`p-3 rounded-xl transition-all hover:scale-110 ${
              isDark
                ? 'bg-blue-900/50 hover:bg-blue-800/50 text-blue-400'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
            }`}
          >
            <Calendar size={24} />
          </button>
        )}

        <button
          onClick={goToNextDate}
          disabled={!canGoNext()}
          className={`p-3 rounded-xl transition-all ${
            canGoNext()
              ? isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-white hover:scale-110'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 hover:scale-110'
              : 'opacity-40 cursor-not-allowed bg-gray-700 text-gray-500'
          }`}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
