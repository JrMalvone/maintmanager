import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AppRole, 
  authenticate as authLogin, 
  getAuthState, 
  logout as authLogout,
  getRedirectForRole,
  ROLE_DISPLAY_NAMES 
} from "@/lib/auth";

interface AppAuthContextType {
  isAuthenticated: boolean;
  role: AppRole | null;
  user: string | null;
  roleDisplayName: string | null;
  loading: boolean;
  login: (user: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AppAuthContext = createContext<AppAuthContextType | undefined>(undefined);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing auth state on mount
    const authState = getAuthState();
    setIsAuthenticated(authState.isAuthenticated);
    setRole(authState.role);
    setUser(authState.user);
    setLoading(false);
  }, []);

  function login(username: string, password: string): { success: boolean; error?: string } {
    const result = authLogin(username, password);
    
    if (result.success && result.role) {
      setIsAuthenticated(true);
      setRole(result.role);
      setUser(username);
      navigate(result.redirectTo || "/dashboard");
      return { success: true };
    }
    
    return { success: false, error: result.error };
  }

  function logout() {
    authLogout();
    setIsAuthenticated(false);
    setRole(null);
    setUser(null);
    navigate("/login");
  }

  const roleDisplayName = role ? ROLE_DISPLAY_NAMES[role] : null;

  return (
    <AppAuthContext.Provider
      value={{
        isAuthenticated,
        role,
        user,
        roleDisplayName,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AppAuthContext.Provider>
  );
}

export function useAppAuth() {
  const context = useContext(AppAuthContext);
  if (context === undefined) {
    throw new Error("useAppAuth must be used within an AppAuthProvider");
  }
  return context;
}
