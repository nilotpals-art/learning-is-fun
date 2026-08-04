import { ReactNode } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      {children}
    </div>
  );
}