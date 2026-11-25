export function Progress({ value, className = "" }: { value: number; className?: string }) {
  return <div className={`h-1.5 overflow-hidden rounded-full bg-sage ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}
