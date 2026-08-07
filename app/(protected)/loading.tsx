export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <p className="text-sm text-muted-foreground">Loading your account…</p>
    </div>
  );
}
