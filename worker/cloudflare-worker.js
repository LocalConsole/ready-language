/**
 * Прокси для ИИ-запросов Миши (Cloudflare Workers, бесплатный тариф).
 * Ключи лежат в секретах Worker'а и не попадают в браузер.
 *
 * Деплой:
 *   1) npm i -g wrangler && wrangler login
 *   2) wrangler init misha-ai  (положи этот файл как src/index.js)
 *   3) wrangler secret put GROQ_KEY        # ключ с console.groq.com
 *      wrangler secret put GEMINI_KEY      # ключ с aistudio.google.com
 *   4) в wrangler.toml:  [vars]  ALLOWED_ORIGIN = "https://ТВОЙ-ЛОГИН.github.io"
 *   5) wrangler deploy → вставь адрес Worker'а в Настройки сайта («Адрес прокси») или в config.js (proxyUrl)
 *
 * Запрос:  POST { messages:[{role,content}], json:boolean }
 * Ответ:   { text:"...", from:"groq|gemini" }
 */
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.0-flash';
const MAX_CHARS = 12000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allow = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': allow === '*' ? '*' : allow,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
    if (allow !== '*' && origin !== allow) return new Response('Forbidden', { status: 403, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
    const messages = Array.isArray(body.messages) ? body.messages.slice(0, 8) : [];
    if (!messages.length || JSON.stringify(messages).length > MAX_CHARS) {
      return new Response('Bad request', { status: 400, headers: cors });
    }

    const errors = [];
    if (env.GROQ_KEY) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.GROQ_KEY },
          body: JSON.stringify({
            model: GROQ_MODEL, messages, temperature: 0.3,
            response_format: body.json ? { type: 'json_object' } : undefined,
          }),
        });
        if (r.ok) {
          const j = await r.json();
          return json({ text: j.choices[0].message.content, from: 'groq' }, cors);
        }
        errors.push('groq ' + r.status);
      } catch (e) { errors.push('groq ' + e.message); }
    }
    if (env.GEMINI_KEY) {
      try {
        const sys = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
        const contents = messages.filter(m => m.role !== 'system')
          .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`,
          {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: sys }] }, contents,
              generationConfig: { temperature: 0.3, responseMimeType: body.json ? 'application/json' : 'text/plain' },
            }),
          });
        if (r.ok) {
          const j = await r.json();
          return json({ text: j.candidates[0].content.parts[0].text, from: 'gemini' }, cors);
        }
        errors.push('gemini ' + r.status);
      } catch (e) { errors.push('gemini ' + e.message); }
    }
    return json({ error: errors.join('; ') || 'no providers configured' }, cors, 503);
  },
};

function json(obj, cors, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
