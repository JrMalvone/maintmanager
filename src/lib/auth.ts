// Server-side authenticated session management
// Credentials are validated server-side via edge function

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "operador" | "manutencao" | "gestor";

const SESSION_STORAGE_KEY = "cmms_session";
// Only a login performed in this window may restore the backend session.
// Unlike persistent auth tokens, this marker disappears when the window closes.
const WINDOW_LOGIN_KEY = "cmms_window_login_v1";

interface SessionState {
  role: AppRole;
  user: string;
  redirectTo: string;
}

interface AuthState {
  isAuthenticated: boolean;
  role: AppRole | null;
  user: string | null;
}

const DB_ROLE_TO_APP_ROLE: Record<string, { role: AppRole; displayName: string; redirectTo: string }> = {
  operator: { role: "operador", displayName: "Produção", redirectTo: "/dashboard/new-order" },
  technician: { role: "manutencao", displayName: "Manutenção", redirectTo: "/dashboard/orders" },
  manager: { role: "gestor", displayName: "Gestor", redirectTo: "/dashboard/analytics" },
};

// Call edge function for login
export async function authenticate(user: string, password: string): Promise<{ 
  success: boolean; 
  role?: AppRole; 
  redirectTo?: string; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase.functions.invoke('authenticate/login', {
      body: { user, password },
    });

    if (error) {
      console.error('Auth error:', error);
      return { success: false, error: "Erro de conexão. Tente novamente." };
    }

    if (!data?.success || !data?.session?.access_token || !data?.session?.refresh_token) {
      return { success: false, error: data?.error || "Usuário ou senha incorretos" };
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      console.error('Failed to establish session:', sessionError);
      return { success: false, error: "Erro ao iniciar sessão. Tente novamente." };
    }

    const sessionState: SessionState = {
      role: data.role,
      user: data.displayName,
      redirectTo: data.redirectTo,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
    sessionStorage.setItem(WINDOW_LOGIN_KEY, "authenticated");

    return {
      success: true,
      role: data.role,
      redirectTo: data.redirectTo,
    };
  } catch (e) {
    console.error('Authentication error:', e);
    return { success: false, error: "Erro de conexão. Tente novamente." };
  }
}

// Validate active backend auth session and fetch role from user_roles
export async function validateSession(): Promise<AuthState> {
  try {
    if (sessionStorage.getItem(WINDOW_LOGIN_KEY) !== "authenticated") {
      // Clear tokens restored from a previous launch without ending sessions
      // on other devices using the same shared account.
      await supabase.auth.signOut({ scope: "local" });
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return { isAuthenticated: false, role: null, user: null };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(WINDOW_LOGIN_KEY);
      return { isAuthenticated: false, role: null, user: null };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      await supabase.auth.signOut();
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return { isAuthenticated: false, role: null, user: null };
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const mapped = !roleError && roleRow?.role ? DB_ROLE_TO_APP_ROLE[roleRow.role] : undefined;
    if (!mapped) {
      await supabase.auth.signOut();
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return { isAuthenticated: false, role: null, user: null };
    }

    const sessionState: SessionState = {
      role: mapped.role,
      user: mapped.displayName,
      redirectTo: mapped.redirectTo,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));

    return {
      isAuthenticated: true,
      role: mapped.role,
      user: mapped.displayName,
    };
  } catch (e) {
    console.error('Session validation error:', e);
    return { isAuthenticated: false, role: null, user: null };
  }
}

// Get cached session state (for UI rendering while validation happens)
export function getAuthState(): AuthState {
  try {
    if (sessionStorage.getItem(WINDOW_LOGIN_KEY) !== "authenticated") {
      return { isAuthenticated: false, role: null, user: null };
    }
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const session: SessionState = JSON.parse(stored);
      return {
        isAuthenticated: true,
        role: session.role,
        user: session.user,
      };
    }
  } catch (e) {
    console.error("Error reading auth state:", e);
  }
  return { isAuthenticated: false, role: null, user: null };
}

export async function logout(): Promise<void> {
  sessionStorage.removeItem(WINDOW_LOGIN_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (e) {
    console.error('Logout error:', e);
  }
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getRedirectForRole(role: AppRole): string {
  const redirects: Record<AppRole, string> = {
    operador: "/dashboard/new-order",
    manutencao: "/dashboard/orders",
    gestor: "/dashboard/analytics",
  };
  return redirects[role] || "/login";
}

export const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  operador: "Operador",
  manutencao: "Manutentor",
  gestor: "Gestor",
};
