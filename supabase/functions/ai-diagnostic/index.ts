import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { machineName, maintenanceType, problemDescription, history } = await req.json();

    const historyText =
      history && history.length > 0
        ? history
            .map(
              (h: { problem: string; solution: string }, i: number) =>
                `${i + 1}. Problema anterior: ${h.problem} -> Solução aplicada: ${h.solution}`
            )
            .join("\n")
        : "Nenhum registro anterior disponível.";

    const systemPrompt = `You are an expert industrial maintenance assistant in an ammunition factory. Always respond in Brazilian Portuguese.`;

    const userPrompt = `- Máquina atual: ${machineName}
- Categoria atual: ${maintenanceType === "electronic" ? "Elétrico" : "Mecânico"}
- Problema atual: ${problemDescription}

Histórico de manutenção desta máquina específica:
${historyText}

Tarefa: Com base no seu conhecimento geral de manutenção industrial E no histórico específico desta máquina fornecido acima, sugira 3 possíveis causas e um primeiro passo recomendado para verificação. Se os sintomas do problema atual forem muito semelhantes a um problema anterior no histórico, você DEVE destacar essa solução anterior como a recomendação principal.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar a IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "Sem resposta da IA.";

    return new Response(
      JSON.stringify({ analysis: content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-diagnostic error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
