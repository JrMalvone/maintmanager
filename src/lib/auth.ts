// Server-side authenticated session management
// Credentials are validated server-side via edge function

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "operador" | "manutencao" | "gestor";

const SESSION_STORAGE_KEY = "cmms_session";

interface SessionState {
  sessionToken: string;
  role: AppRole;
  user: string;
  redirectTo: string;
}

interface AuthState {
  isAuthenticated: boolean;
  role: AppRole | null;
  user: string | null;
}

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

    if (!data.success) {
      return { success: false, error: data.error || "Usuário ou senha incorretos" };
    }

    // Store session token (NOT role/auth state - that comes from server validation)
    const sessionState: SessionState = {
      sessionToken: data.sessionToken,
      role: data.role,
      user: data.displayName,
      redirectTo: data.redirectTo,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));

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

// Validate session with server
export async function validateSession(): Promise<AuthState> {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return { isAuthenticated: false, role: null, user: null };
    }

    const session: SessionState = JSON.parse(stored);
    
    const { data, error } = await supabase.functions.invoke('authenticate/validate', {
      body: { sessionToken: session.sessionToken },
    });

    if (error || !data.valid) {
      // Invalid session - clear local storage
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return { isAuthenticated: false, role: null, user: null };
    }

    return {
      isAuthenticated: true,
      role: data.role,
      user: data.user,
    };
  } catch (e) {
    console.error('Session validation error:', e);
    return { isAuthenticated: false, role: null, user: null };
  }
}

// Get cached session state (for UI rendering while validation happens)
export function getAuthState(): AuthState {
  try {
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
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const session: SessionState = JSON.parse(stored);
      await supabase.functions.invoke('authenticate/logout', {
        body: { sessionToken: session.sessionToken },
      });
    }
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
