import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { permissionForPath } from "@/lib/auth/permissions";

const PROTECTED_PATHS = [
  "/dashboard",
  "/student",
  "/parent",
  "/masters",
  "/students",
  "/attendance",
  "/learning-planner",
  "/practice-work",
  "/fees",
  "/administration",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isStaffRole(role: string | null): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === "teacher" || normalized === "accountant";
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedPath(pathname)) return redirectTo(request, "/login");
  if (!user) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();

  if (profile?.is_active === false && isProtectedPath(pathname)) return redirectTo(request, "/inactive");

  if (isStaffRole(profile?.role ?? null) && isProtectedPath(pathname)) {
    if (pathname === "/dashboard") return response;
    const requiredPermission = permissionForPath(pathname);
    if (!requiredPermission) return redirectTo(request, "/unauthorized");
    const { data: permissionCodes, error } = await supabase.rpc("current_user_permission_codes");
    if (error || !Array.isArray(permissionCodes) || !permissionCodes.includes(requiredPermission)) {
      return redirectTo(request, "/unauthorized");
    }
  }

  return response;
}
