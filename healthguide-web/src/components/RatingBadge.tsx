interface Props {
  ratingCount: number;
  positiveCount: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingBadge({ ratingCount, positiveCount, size = 'md' }: Props) {
  if (ratingCount === 0) {
    return (
      <span className="text-gray-400 text-xs">No reviews yet</span>
    );
  }

  const percentage = Math.round((positiveCount / ratingCount) * 100);
  const isPositive = percentage >= 50;

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const thumbSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      <span className={thumbSize[size]}>{isPositive ? '\uD83D\uDC4D' : '\uD83D\uDC4E'}</span>
      <span className="font-semibold text-gray-700">{percentage}%</span>
      <span className="text-gray-400">({ratingCount})</span>
    </div>
  );
}
