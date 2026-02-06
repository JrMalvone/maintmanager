// Hardcoded credentials authentication system
// This replaces Supabase auth with simple role-based login

export type AppRole = "operador" | "manutencao" | "gestor";

interface Credentials {
  user: string;
  password: string;
  role: AppRole;
  redirectTo: string;
}

const ALLOWED_CREDENTIALS: Credentials[] = [
  {
    user: "Operador",
    password: "123",
    role: "operador",
    redirectTo: "/dashboard/new-order",
  },
  {
    user: "Manutenção",
    password: "manut26273",
    role: "manutencao",
    redirectTo: "/dashboard/orders",
  },
  {
    user: "Gestor",
    password: "sup24496",
    role: "gestor",
    redirectTo: "/dashboard/analytics",
  },
];

const AUTH_STORAGE_KEY = "cmms_auth";

interface AuthState {
  isAuthenticated: boolean;
  role: AppRole | null;
  user: string | null;
}

export function authenticate(user: string, password: string): { success: boolean; role?: AppRole; redirectTo?: string; error?: string } {
  const credentials = ALLOWED_CREDENTIALS.find(
    (c) => c.user.toLowerCase() === user.toLowerCase() && c.password === password
  );

  if (!credentials) {
    return { success: false, error: "Usuário ou senha incorretos" };
  }

  // Store auth state in sessionStorage
  const authState: AuthState = {
    isAuthenticated: true,
    role: credentials.role,
    user: credentials.user,
  };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));

  return {
    success: true,
    role: credentials.role,
    redirectTo: credentials.redirectTo,
  };
}

export function getAuthState(): AuthState {
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Error reading auth state:", e);
  }
  return { isAuthenticated: false, role: null, user: null };
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getRedirectForRole(role: AppRole): string {
  const creds = ALLOWED_CREDENTIALS.find((c) => c.role === role);
  return creds?.redirectTo || "/login";
}

export const ROLE_DISPLAY_NAMES: Record<AppRole, string> = {
  operador: "Operador",
  manutencao: "Manutentor",
  gestor: "Gestor",
};
