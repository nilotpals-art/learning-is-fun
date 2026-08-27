"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const ROOT_PAGES = new Set(["/dashboard", "/student/dashboard", "/parent/dashboard"]);

export function PageBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (ROOT_PAGES.has(pathname)) return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    if (pathname.startsWith("/student")) {
      router.push("/student/dashboard");
      return;
    }

    if (pathname.startsWith("/parent")) {
      router.push("/parent/dashboard");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mb-5"
      aria-label="Go back to the previous page"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back
    </button>
  );
}
