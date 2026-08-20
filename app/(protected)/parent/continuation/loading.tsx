export default function ParentContinuationLoading() {
  return <div className="space-y-6" aria-label="Loading Continuation"><div className="h-40 animate-pulse rounded-3xl bg-primary/20" /><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl bg-muted" />)}</div></div>;
}