interface RupeeSymbolProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function RupeeSymbol({ className = '', size = 'md' }: RupeeSymbolProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl'
  };

  return (
    <span className={`font-serif font-bold ${sizeClasses[size]} ${className}`}>
      ₹
    </span>
  );
}
