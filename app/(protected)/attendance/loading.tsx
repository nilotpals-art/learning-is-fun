import { Card, CardContent } from "@/components/ui/card";

export default function AttendanceLoading() {
  return <div className="space-y-6" aria-label="Loading Daily Attendance"><div className="h-32 animate-pulse rounded-3xl bg-muted" /><Card><CardContent className="grid gap-4 p-6 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}</CardContent></Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div></div>;
}
