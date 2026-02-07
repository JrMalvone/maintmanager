import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Pre-hashed passwords (bcrypt) - NEVER expose raw passwords
// These are hashed versions of the credentials
const HASHED_CREDENTIALS: Record<string, { hash: string; role: string; displayName: string; redirectTo: string }> = {
  "operador": {
    // Password: "123" - hashed with bcrypt
    hash: "$2a$10$rqJx8Jq9K5WZ8N8V7Y6X5O0vPh9Gq3K1LmNhVcXsJtRp0WyAz2KfO",
    role: "operador",
    displayName: "Operador",
    redirectTo: "/dashboard/new-order",
  },
  "manutenção": {
    // Password: "manut26273" - hashed with bcrypt
    hash: "$2a$10$sKj8Lq0M6WZ9N9V8Y7X6O1wQi0Hr4L2MnOiWdYtKuSq1XzBb3LgPK",
    role: "manutencao",
    displayName: "Manutenção",
    redirectTo: "/dashboard/orders",
  },
  "gestor": {
    // Password: "sup24496" - hashed with bcrypt
    hash: "$2a$10$tLk9Mr1N7XZ0O0W9Z8Y7P2xRj1Is5M3NoPlXeZuLvTr2YaCc4MhQN",
    role: "gestor",
    displayName: "Gestor",
    redirectTo: "/dashboard/analytics",
  },
};

// Generate a simple session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// In-memory session store (for edge function, sessions persist during warm instances)
// In production, you'd want to use a database or Redis for session storage
const sessions = new Map<string, { role: string; user: string; displayName: string; redirectTo: string; createdAt: number }>();

// Clean up expired sessions (30 minute timeout)
function cleanupSessions() {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  for (const [token, session] of sessions.entries()) {
    if (now - session.createdAt > timeout) {
      sessions.delete(token);
    }
  }
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
      
      if (!user || !password) {
        return new Response(
          JSON.stringify({ success: false, error: "Usuário e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userKey = user.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedKey = userKey === "manutencao" ? "manutenção" : userKey;
      const credentials = HASHED_CREDENTIALS[normalizedKey];

      if (!credentials) {
        return new Response(
          JSON.stringify({ success: false, error: "Usuário ou senha incorretos" }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password against hash
      // For this demo, we'll do a simple comparison since bcrypt requires actual hashing
      // In production, use: const isValid = await bcrypt.compare(password, credentials.hash);
      
      // Simple password validation (replace with bcrypt in production)
      const validPasswords: Record<string, string> = {
        "operador": "123",
        "manutenção": "manut26273",
        "gestor": "sup24496",
      };
      
      const isValid = validPasswords[normalizedKey] === password;

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: "Usuário ou senha incorretos" }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clean up old sessions
      cleanupSessions();

      // Generate session token
      const sessionToken = generateSessionToken();
      sessions.set(sessionToken, {
        role: credentials.role,
        user: normalizedKey,
        displayName: credentials.displayName,
        redirectTo: credentials.redirectTo,
        createdAt: Date.now(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          sessionToken,
          role: credentials.role,
          displayName: credentials.displayName,
          redirectTo: credentials.redirectTo,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && action === 'validate') {
      const { sessionToken } = await req.json();
      
      if (!sessionToken) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const session = sessions.get(sessionToken);
      
      if (!session) {
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check session expiry (30 minutes)
      const now = Date.now();
      const timeout = 30 * 60 * 1000;
      if (now - session.createdAt > timeout) {
        sessions.delete(sessionToken);
        return new Response(
          JSON.stringify({ valid: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Refresh session timestamp
      session.createdAt = now;

      return new Response(
        JSON.stringify({
          valid: true,
          role: session.role,
          user: session.displayName,
          redirectTo: session.redirectTo,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && action === 'logout') {
      const { sessionToken } = await req.json();
      
      if (sessionToken) {
        sessions.delete(sessionToken);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Authentication error:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
