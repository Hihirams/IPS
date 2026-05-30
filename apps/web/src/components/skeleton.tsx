/**
 * Skeleton loaders para estados de carga (estilo glass + shimmer).
 */

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-[22px] p-3.5">
      <div className="shimmer aspect-[4/3] rounded-[16px]" />
      <div className="mt-3.5 space-y-2.5 px-1">
        <div className="shimmer h-3 w-1/3 rounded-full" />
        <div className="shimmer h-4 w-3/4 rounded-full" />
        <div className="shimmer h-5 w-1/4 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-4 rounded-full"
          style={{ width: `${100 - (i % 3) * 20}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonImage({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-[16px] ${className}`} />;
}
