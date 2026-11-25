import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SharedAccount {
  role: "operador" | "manutencao" | "gestor";
  dbRole: "operator" | "technician" | "manager";
  authEmail: string;
  displayName: string;
  redirectTo: string;
  password: string;
}

const SHARED_ACCOUNTS: Record<string, SharedAccount> = {
  "produção": {
    role: "operador",
    dbRole: "operator",
    authEmail: "producao@cmms.internal",
    displayName: "Produção",
    redirectTo: "/dashboard/new-order",
    password: "opera20990",
  },
  "manutenção": {
    role: "manutencao",
    dbRole: "technician",
    authEmail: "manutencao@cmms.internal",
    displayName: "Manutenção",
    redirectTo: "/dashboard/orders",
    password: "manut26273",
  },
  "gestor": {
    role: "gestor",
    dbRole: "manager",
    authEmail: "gestor@cmms.internal",
    displayName: "Gestor",
    redirectTo: "/dashboard/analytics",
    password: "sup24496",
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function issueAuthSession(account: SharedAccount) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    throw new Error("Missing backend auth configuration");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let linkRes = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: account.authEmail,
  });

  if (linkRes.error || !linkRes.data?.user) {
    const createRes = await supabaseAdmin.auth.admin.createUser({
      email: account.authEmail,
      email_confirm: true,
      user_metadata: {
        display_name: account.displayName,
        shared_account: true,
      },
    });

    if (createRes.error && !createRes.error.message.toLowerCase().includes("already")) {
      throw new Error(`Failed to provision account: ${createRes.error.message}`);
    }

    linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: account.authEmail,
    });
  }

  if (linkRes.error || !linkRes.data?.user || !linkRes.data.properties?.hashed_token) {
    throw new Error(`Failed to create auth link: ${linkRes.error?.message ?? "unknown error"}`);
  }

  const userId = linkRes.data.user.id;

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role: account.dbRole },
      { onConflict: "user_id,role", ignoreDuplicates: true }
    );

  if (roleError) {
    throw new Error(`Failed to ensure role: ${roleError.message}`);
  }

  const otpType = (linkRes.data.properties.verification_type === "signup"
    ? "signup"
    : "magiclink") as "signup" | "magiclink";

  const { data: verified, error: verifyError } = await supabaseAnon.auth.verifyOtp({
    token_hash: linkRes.data.properties.hashed_token,
    type: otpType,
  });

  if (verifyError || !verified.session) {
    throw new Error(`Failed to verify session: ${verifyError?.message ?? "missing session"}`);
  }

  return {
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (req.method === 'POST' && action === 'login') {
      const { user, password } = await req.json();

      if (!user || !password || typeof user !== 'string' || typeof password !== 'string') {
        return jsonResponse({ success: false, error: "Usuário e senha são obrigatórios" }, 400);
      }

      const userKey = user.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const accentMap: Record<string, string> = {
        "manutencao": "manutenção",
        "producao": "produção",
        "operador": "produção", // legado: usuário antigo continua funcionando
      };
      const normalizedKey = accentMap[userKey] ?? userKey;
      const account = SHARED_ACCOUNTS[normalizedKey];

      if (!account || account.password !== password) {
        return jsonResponse({ success: false, error: "Usuário ou senha incorretos" }, 401);
      }

      const session = await issueAuthSession(account);

      return jsonResponse({
        success: true,
        session,
        role: account.role,
        displayName: account.displayName,
        redirectTo: account.redirectTo,
      });
    }

    if (req.method === 'POST' && action === 'validate') {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) return jsonResponse({ valid: false });

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ valid: false });

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user) return jsonResponse({ valid: false });

      const { data: roleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      const dbRoleToApp: Record<string, { role: string; displayName: string; redirectTo: string }> = {
        operator: { role: "operador", displayName: "Produção", redirectTo: "/dashboard/new-order" },
        technician: { role: "manutencao", displayName: "Manutenção", redirectTo: "/dashboard/orders" },
        manager: { role: "gestor", displayName: "Gestor", redirectTo: "/dashboard/analytics" },
      };
      const mapped = roleRow?.role ? dbRoleToApp[roleRow.role] : undefined;
      if (!mapped) return jsonResponse({ valid: false });

      return jsonResponse({
        valid: true,
        role: mapped.role,
        user: mapped.displayName,
        redirectTo: mapped.redirectTo,
      });
    }

    if (req.method === 'POST' && action === 'logout') {
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Not found" }, 404);

  } catch (error) {
    console.error('Authentication error:', error);
    return jsonResponse({ success: false, error: "Erro interno do servidor" }, 500);
  }
});
