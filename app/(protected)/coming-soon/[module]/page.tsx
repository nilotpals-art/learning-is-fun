import Link from "next/link";
import { Construction } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { findNavigationItemBySlug } from "@/lib/navigation";

export default async function ComingSoonPage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const item = findNavigationItemBySlug(module);

  if (!item || item.enabled || item.title === "Logout") {
    notFound();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-xl bg-card text-card-foreground">
        <CardHeader className="items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Construction className="size-6" aria-hidden="true" />
          </span>
          <Badge variant="secondary" className="mt-3">Coming Soon</Badge>
          <CardTitle className="text-2xl">{item.title}</CardTitle>
          <CardDescription>
            This module is planned but is not available yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button nativeButton={false} render={<Link href="/dashboard" />}>Return to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}
