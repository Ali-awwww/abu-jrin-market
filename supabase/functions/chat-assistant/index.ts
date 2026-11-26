import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `أنت مساعد سوق قرية أبو جرين، تكلّم بالعربية وبودّ وبشكل حواري طبيعي. أجب فقط من بيانات Supabase الحقيقية المرفقة في السياق، ولا تخترع أبداً دكاناً أو منتجاً أو سعراً أو توفراً، وإذا كانت قاعدة البيانات فارغة قل ذلك بصدق. التحيات تردّ عليها بتحية طبيعية، والأسئلة تجيب عنها.
بيانات السوق الحالية من قاعدة البيانات:
${context || 'لا توجد بيانات متاحة حالياً.'}`;

    const contents = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || "عذراً، لم أتمكن من صياغة رد.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({ error: errMessage || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
