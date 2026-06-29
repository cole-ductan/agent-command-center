import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Deletes the signed-in user's account.
 *
 * - Deletes every workspace where they are the sole owner (via delete_workspace RPC,
 *   which itself enforces owner-only access).
 * - Removes their membership from any other workspaces.
 * - Deletes their profile row.
 * - Deletes the auth user via the Admin API.
 *
 * If a workspace they own has other members, the call fails with a clear
 * message asking them to transfer ownership or remove members first.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1. Workspaces where this user is owner.
    const { data: ownedRows, error: ownedErr } = await supabase
      .from("tenant_members")
      .select("tenant_id, tenants(name)")
      .eq("user_id", userId)
      .eq("role", "owner");
    if (ownedErr) throw new Error(ownedErr.message);

    const ownedTenantIds = (ownedRows ?? []).map((r: any) => r.tenant_id);

    // For each owned workspace, make sure it has no *other* members.
    for (const tid of ownedTenantIds) {
      const { count, error } = await supabase
        .from("tenant_members")
        .select("user_id", { count: "exact", head: true })
        .eq("tenant_id", tid)
        .neq("user_id", userId);
      if (error) throw new Error(error.message);
      if ((count ?? 0) > 0) {
        const name =
          (ownedRows ?? []).find((r: any) => r.tenant_id === tid)?.tenants?.name ?? "a workspace";
        throw new Error(
          `Cannot delete account: you still own "${name}" with other members. Transfer ownership or remove the other members first.`,
        );
      }
    }

    // 2. Delete owned workspaces (RPC enforces owner-only + cleans all child rows).
    for (const tid of ownedTenantIds) {
      const { error } = await supabase.rpc("delete_workspace", { p_tenant_id: tid });
      if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
    }

    // 3. Remove any remaining memberships in other workspaces.
    await supabase.from("tenant_members").delete().eq("user_id", userId);

    // 4. Delete profile (safe — no FK from auth.users requires it).
    await supabase.from("profiles").delete().eq("id", userId);

    // 5. Delete the auth user via the Admin API.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: adminErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (adminErr) throw new Error(`Failed to delete auth user: ${adminErr.message}`);

    return { ok: true };
  });
