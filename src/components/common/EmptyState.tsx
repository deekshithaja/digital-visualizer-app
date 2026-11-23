import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#263653] dark:border-[#263653] bg-[#050F20] dark:bg-[#172641] text-[#A9B7CE] dark:text-[#F4F7FF]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-[#F4F7FF] dark:text-[#F4F7FF]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-[#A9B7CE] dark:text-[#A9B7CE] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
