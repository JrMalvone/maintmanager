import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const Body = z.object({
  machineName: z.string().min(1).max(200),
  sectorName: z.string().max(200).optional().default(""),
  period: z.string().max(100),
  kpis: z.record(z.union([z.string(), z.number()])),
  orders: z
    .array(
      z.object({
        date: z.string().max(40),
        type: z.string().max(40),
        stopped: z.boolean(),
        problem: z.string().max(1000),
        solution: z.string().max(1000).optional().default(""),
        durationMin: z.number().optional(),
      }),
    )
    .max(150),
});

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "LOVABLE_API_KEY não configurada" }, 500);
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Dados inválidos" }, 400);
    const d = parsed.data;

    const hist = d.orders.length
      ? d.orders
          .map(
            (o, i) =>
              `${i + 1}. [${o.date}] ${o.type}${o.stopped ? " (MÁQUINA PARADA)" : ""}${o.durationMin ? ` – ${o.durationMin} min` : ""}\n   Problema: ${o.problem}\n   Solução: ${o.solution || "—"}`,
          )
          .join("\n")
      : "Nenhuma ordem no período.";

    const prompt = `Equipamento: ${d.machineName}
Setor: ${d.sectorName}
Período analisado: ${d.period}
Indicadores: ${Object.entries(d.kpis).map(([k, v]) => `${k}: ${v}`).join(" | ")}

Histórico de ordens de serviço:
${hist}

Escreva um parecer técnico de engenharia de confiabilidade em Markdown, com as seções:
## Resumo executivo
## Falhas recorrentes (modos de falha que se repetem, com quantidade)
## Causas prováveis
## Plano de ação recomendado (preventiva/preditiva, itens objetivos)
## Classificação de risco (Baixo, Médio ou Crítico, com justificativa)
Seja direto e prático, sem inventar dados que não estão no histórico.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "Você é um engenheiro sênior de manutenção industrial e confiabilidade (RCM/FMEA) em uma fábrica de munições. Responda sempre em português do Brasil.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("gateway", res.status, t);
      if (res.status === 429) return json({ error: "Muitas requisições. Aguarde um instante e tente de novo." }, 429);
      if (res.status === 402) return json({ error: "Créditos de IA esgotados no workspace." }, 402);
      if (res.status === 403) return json({ error: "Acesso à IA bloqueado para este workspace." }, 403);
      return json({ error: "Erro ao consultar a IA." }, 500);
    }

    // Consume SSE stream and accumulate text
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim();
        if (p === "[DONE]") continue;
        try {
          out += JSON.parse(p).choices?.[0]?.delta?.content || "";
        } catch { /* partial */ }
      }
    }
    if (!out.trim()) return json({ error: "A IA não retornou resposta." }, 502);
    return json({ analysis: out });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
