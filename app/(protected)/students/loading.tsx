import { Card, CardContent } from "@/components/ui/card";

export default function StudentsLoading() {
  return <div className="space-y-6" aria-label="Loading Students"><div className="h-20 animate-pulse rounded-2xl bg-muted" /><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div><Card><CardContent className="space-y-3 p-6">{[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-muted" />)}</CardContent></Card></div>;
}
