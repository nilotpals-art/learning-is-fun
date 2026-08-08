import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import { normalizeEmail } from "@/lib/validation/normalization";

export interface ManagedAuthUser {
  id: string;
  email: string;
}

export class AdminAuthConfigurationError extends Error {
  constructor() {
    super("Supabase Admin Auth is not configured.");
    this.name = "AdminAuthConfigurationError";
  }
}

export class AdminAuthOperationError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number
  ) {
    super("Supabase Admin Auth operation failed.");
    this.name = "AdminAuthOperationError";
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new AdminAuthConfigurationError();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function normalizedUser(user: User): ManagedAuthUser | null {
  const email = user.email ? normalizeEmail(user.email) : undefined;
  return email ? { id: user.id, email } : null;
}

export async function findManagedAuthUserByEmail(
  email: string
): Promise<ManagedAuthUser | null> {
  const client = adminClient();
  const normalizedEmail = normalizeEmail(email);
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new AdminAuthOperationError(
        error.code ?? "list_users_failed",
        error.status
      );
    }

    for (const user of data.users) {
      const managed = normalizedUser(user);
      if (managed?.email === normalizedEmail) return managed;
    }

    if (data.users.length < perPage) return null;
  }
}

export async function getManagedAuthUserById(
  id: string
): Promise<ManagedAuthUser | null> {
  const client = adminClient();
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error) {
    if (error.status === 404 || error.code === "user_not_found") return null;
    throw new AdminAuthOperationError(error.code ?? "get_user_failed", error.status);
  }
  return normalizedUser(data.user);
}

export async function createManagedAuthUser(
  email: string
): Promise<ManagedAuthUser> {
  const client = adminClient();
  const { data, error } = await client.auth.admin.createUser({
    email: normalizeEmail(email),
    email_confirm: true,
  });
  if (error) {
    throw new AdminAuthOperationError(
      error.code ?? "create_user_failed",
      error.status
    );
  }

  const user = normalizedUser(data.user);
  if (!user) throw new AdminAuthOperationError("created_user_has_no_email");
  return user;
}

export async function deleteManagedAuthUser(id: string): Promise<void> {
  const client = adminClient();
  const { error } = await client.auth.admin.deleteUser(id);
  if (error) {
    throw new AdminAuthOperationError(
      error.code ?? "delete_user_failed",
      error.status
    );
  }
}
