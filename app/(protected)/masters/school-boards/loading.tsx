import { Card, CardContent } from "@/components/ui/card";

export default function SchoolBoardsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading School Boards">
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-32 max-w-md animate-pulse rounded-2xl bg-muted" />
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
