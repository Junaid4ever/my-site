import { LucideIcon } from 'lucide-react';
import { RupeeSymbol } from './RupeeSymbol';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  isDark: boolean;
  showRupee?: boolean;
  subtitle?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  isDark,
  showRupee = false,
  subtitle
}: StatsCardProps) {
  return (
    <div className={`rounded-2xl shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
      isDark
        ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon size={24} className={iconColor} />
        </div>
      </div>
      <h3 className={`text-sm font-semibold mb-2 ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {title}
      </h3>
      <div className={`text-3xl font-bold flex items-center gap-2 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        {showRupee && <RupeeSymbol size="xl" className="font-bold" />}
        {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </div>
      {subtitle && (
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
