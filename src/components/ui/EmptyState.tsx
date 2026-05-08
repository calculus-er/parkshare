'use client';

interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] p-12 text-center">
      <svg
        className="w-16 h-16 mx-auto mb-4 text-white/15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 14l3-3 2 2 3-3 2 2" />
        <path d="M8 8h.01" />
      </svg>
      <h2 className="text-white/45 text-lg font-light mb-2">{title}</h2>
      <p className="text-white/25 text-sm">{description}</p>
    </div>
  );
}
