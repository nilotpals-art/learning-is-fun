import { Card, CardContent } from "@/components/ui/card";

export default function BatchesLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading Batches">
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-6">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </CardContent>
      </Card>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
