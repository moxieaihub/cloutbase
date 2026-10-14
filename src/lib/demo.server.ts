
import { supabase } from "@/integrations/supabase/client.server";

export type DemoRole = "business" | "clipper" | "";

const DEMO = {
  business: {
    email: "demo.business@cloutbase.demo",
    username: "demo_business",
  },
  clipper: {
    email: "demo.clipper@cloutbase.demo",
    username: "demo_clipper",
  },
  admin: {
    email: "demo.admin@cloutbase.demo",
    username: "demo_admin",
  },
} as const;

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `Demo!${Array.from(bytes, (b) => b.toString(36)).join("")}`;
}

async function findUserByEmail(email: string) {
  const { data, error } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

  if (error) {
    throw new Error(`Failed to find demo user: ${error.message}`);
  }

  return (
    data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    ) ?? null
  );
}

/**
 * Ensures a demo account exists, refreshes its password,
 * assigns its roles and returns its login credentials.
 */
export async function ensureDemoAccount(role: DemoRole) {
  const cfg = DEMO[role];
  const password = randomPassword();
const accountType = role === "admin" ? "clipper" : role;
  let user = await findUserByEmail(cfg.email);

  if (!user) {
    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
        email: cfg.email,
        password,
        email_confirm: true,
        user_metadata: {
          username: cfg.username,
          account_type: accountType,
          demo: true,
        },
      });

    if (error) {
      throw new Error(`Failed to create demo account: ${error.message}`);
    }

    user = data.user;
  } else {
    const { error } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
      });

    if (error) {
      throw new Error(`Failed to update demo account: ${error.message}`);
    }
  }

  if (!user) {
    throw new Error("Could not prepare the demo account.");
  }

  // Create or update the user's profile.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username: cfg.username,
        account_type: accountType,
        email: cfg.email,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    throw new Error(`Demo profile: ${profileError.message}`);
  }

  // Admin demo accounts require both admin and clipper roles.
  const roles: string[] =
    role === "admin" ? ["admin", "clipper"] : [role];

  for (const assignedRole of roles) {
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(
        {
          user_id: user.id,
          role: assignedRole as any,
        },
        { onConflict: "user_id,role" },
      );

    if (roleError) {
      throw new Error(
        `Demo role "${assignedRole}": ${roleError.message}`,
      );
    }
  }

  // Verify that the required roles were successfully assigned.
  const { data: granted, error: verifyError } =
    await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

  if (verifyError) {
    throw new Error(
      `Failed to verify demo roles: ${verifyError.message}`,
    );
  }

  const grantedRoles = (granted ?? []).map((item) => item.role);

  for (const requiredRole of roles) {
    if (!grantedRoles.includes(requiredRole)) {
      throw new Error(
        `Demo role "${requiredRole}" could not be verified.`,
      );
    }
  }

  // Create or update the clipper profile for clippers and s.
  if (role !== "business") {
    const { error: clipperError } = await supabase
      .from("clipper_profiles")
      .upsert(
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

    if (clipperError) {
      throw new Error(
        `Demo clipper profile: ${clipperError.message}`,
      );
    }
  }

  return {
    email: cfg.email,
    password,
  };
}
