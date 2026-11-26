import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Uses the Gemini Interactions API (the recommended API for current models
// such as gemini-3.8-flash). The legacy generateContent endpoint hangs
// for this model, so it is not used here. If the primary model is
// overloaded (HTTP 503), the next model in the list is tried.
const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, history, context } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in Supabase secrets');
    }
    const systemInstruction = `أنت مساعد سوق قرية أبو جرين، تكلّم بالعربية وبودّ وبشكل حواري طبيعي. أجب فقط من بيانات Supabase المرفقة في السياق، ولا تخترع
أبداً دكاناً أو منتجاً أو سعراً أو توفراً. وإذا كانت قاعدة البيانات فارغة فقل ذلك بصدق. ردّ على التحيات بتحية طبيعية، والأسئلة عن السوق الحالية تجيب عنها بصدق. بيانات السوق الحالية:
${context || 'لا توجد بيانات متاحة حالياً.'}`;

    const input = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        input.push({
          type: h.role === 'assistant' ? 'model_output' : 'user_input',
          content: [{ type: 'text', text: h.content }],
        });
      }
    }
    input.push({
      type: 'user_input',
      content: [{ type: 'text', text: message }],
    });

    let lastError = '';
    for (const model of MODELS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      let geminiRes;
      try {
        geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/interactions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              model,
              system_instruction: systemInstruction,
              generation_config: { thinking_level: 'low' },
              store: false,
              input,
            }),
            signal: controller.signal,
          },
        );
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
      clearTimeout(timeoutId);

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        lastError = `Gemini API error ${geminiRes.status}: ${errText.slice(0, 300)}`;
        // Only retry on overload / transient server errors, not on
        // client errors (400/401/403/404) or quota errors (429).
        if (geminiRes.status === 503 || geminiRes.status >= 500) continue;
        throw new Error(lastError);
      }

      const data = await geminiRes.json();
      const steps = Array.isArray(data?.steps) ? data.steps : [];
      let reply = '';
      for (const step of steps) {
        if (step?.type === 'model_output' && Array.isArray(step.content)) {
          reply += step.content.map((c) => c.text || '').join('');
        }
      }
      if (!reply) reply = "عذراً، لم أتمكن من صياغة ردّ.";

      return new Response(
        JSON.stringify({ reply }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(lastError || 'All Gemini models failed');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({ error: errMessage || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
