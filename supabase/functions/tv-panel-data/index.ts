import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing backend configuration");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const [ordersRes, machinesRes, sectorsRes, logsRes] = await Promise.all([
      supabaseAdmin
        .from("service_orders")
        .select(
          "id, machine_id, machine_number, status, is_machine_stopped, maintenance_type, problem_description, created_at, technician_name"
        )
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("machines")
        .select("id, code, model, manufacturer, sector_id, status")
        .order("code"),
      supabaseAdmin
        .from("sectors")
        .select("id, name")
        .order("name"),
      supabaseAdmin
        .from("work_logs")
        .select("order_id, technician_name")
        .is("ended_at", null),
    ]);

    if (ordersRes.error || machinesRes.error || sectorsRes.error || logsRes.error) {
      console.error("TV panel query error:", {
        orders: ordersRes.error,
        machines: machinesRes.error,
        sectors: sectorsRes.error,
        logs: logsRes.error,
      });
      return new Response(JSON.stringify({ error: "Erro ao carregar painel" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        orders: ordersRes.data ?? [],
        machines: machinesRes.data ?? [],
        sectors: sectorsRes.data ?? [],
        activeLogs: logsRes.data ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("TV panel error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});