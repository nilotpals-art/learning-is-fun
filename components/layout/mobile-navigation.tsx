"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavigationItem } from "@/lib/navigation";

interface MobileNavigationProps {
  instituteName: string;
  items: readonly NavigationItem[];
}

export function MobileNavigation({
  instituteName,
  items,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="lg:hidden"
        render={<Button variant="outline" size="icon" aria-label="Open navigation" />}
      >
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(22rem,88vw)] border-0 p-0" showCloseButton={false}>
        <SheetTitle className="sr-only">Application navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Navigate between Learning Is Fun ERP modules.
        </SheetDescription>
        <AppSidebar
          instituteName={instituteName}
          items={items}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
