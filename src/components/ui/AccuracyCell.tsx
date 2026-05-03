import { getAccuracyColor } from '@/lib/utils';

interface AccuracyCellProps {
  accuracy: number;
  showLabel?: boolean;
}

export default function AccuracyCell({ accuracy, showLabel = true }: AccuracyCellProps) {
  const { bg, text } = getAccuracyColor(accuracy);

  return (
    <span
      className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold min-w-[50px]"
      style={{ background: bg, color: text }}
    >
      {showLabel ? `${accuracy}%` : accuracy}
    </span>
  );
}
