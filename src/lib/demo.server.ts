import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DemoRole = "business" | "clipper" | "admin";

const DEMO = {
  business: { email: "demo.business@cloutbase.demo", username: "demo_business" },
  clipper: { email: "demo.clipper@cloutbase.demo", username: "demo_clipper" },
  admin: { email: "demo.admin@cloutbase.demo", username: "demo_admin" },
} as const;

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `Demo!${Array.from(bytes, (b) => b.toString(36)).join("")}`;
}

async function findUserByEmail(email: string) {
  // Demo users are few; a single page scan is enough.
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(error.message);
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

/** Ensures a demo account exists, refreshes its password, and returns credentials. */
export async function ensureDemoAccount(role: DemoRole) {
  const cfg = DEMO[role];
  const password = randomPassword();
  const accountType = role === "admin" ? "clipper" : role;

  let user = await findUserByEmail(cfg.email);

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cfg.email,
      password,
      email_confirm: true,
      user_metadata: { username: cfg.username, account_type: accountType, demo: true },
    });
    if (error) throw new Error(error.message);
    user = data.user;
  } else {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
  }

  if (!user) throw new Error("Could not prepare the demo account.");

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: user.id, username: cfg.username, account_type: accountType, email: cfg.email },
      { onConflict: "id" },
    );
  if (profileError) throw new Error(`Demo profile: ${profileError.message}`);

  const roles: string[] = role === "admin" ? ["admin", "clipper"] : [role];
  for (const r of roles) {
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ user_id: user.id, role: r as any }, { onConflict: "user_id,role" });
    // Previously ignored: a failed insert left the demo admin without the admin
    // role, so /admin silently redirected to the clipper dashboard.
    if (roleError) throw new Error(`Demo role "${r}": ${roleError.message}`);
  }

  // Verify the roles really landed before handing back credentials.
  const { data: granted, error: verifyError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (verifyError) throw new Error(verifyError.message);
  if (role === "admin" && !(granted ?? []).some((g) => g.role === "admin")) {
    throw new Error("Demo admin role could not be granted.");
  }

  if (role !== "business") {
    await supabaseAdmin.from("clipper_profiles").upsert(
      {
        user_id: user.id,
        real_name: "Demo Clipper",
        followers_count: 12000,
        avg_views: 45000,
        is_approved: true,
        is_inhouse: true,
        is_priority: true,
      },
      { onConflict: "user_id" },
    );
  }

  return { email: cfg.email, password };
}
