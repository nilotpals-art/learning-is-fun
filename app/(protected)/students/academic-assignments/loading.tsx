export default function StudentAcademicAssignmentsLoading() {
  return <div className="space-y-6" aria-label="Loading Student Academic Assignments"><div className="h-40 animate-pulse rounded-3xl bg-primary/20" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div><div className="h-80 animate-pulse rounded-2xl bg-muted" /></div>;
}
