/* Street practice for Show-Up Academy, the paid path: a tourist couple to pitch, and Shoco's feedback after.
   The free path runs in the Claude version of the app, on each person's own Claude account, and never calls this.
   The Anthropic key stays here, in the Edge Function secret SUA_ANTHROPIC_KEY. Without it, every call answers { err: "off" }.
   Optional secrets: SUA_RP_MODEL (default claude-haiku-5-5, the cheapest; claude-opus-5-5 coaches better),
   SUA_COACH_MODEL (default: same), SUA_RP_PER_DAY (chats per person per day, default 6),
   SUA_RP_TEAM_DAY (chats per day for everyone, default 150).
   Voice: with SUA_OPENAI_KEY set, the phone records the promoter and this function transcribes it
   (SUA_STT_MODEL, default gpt-4o-mini-transcribe) and reads the couple's lines in natural voices
   (SUA_TTS_MODEL, default gpt-4o-mini-tts). Without it, phones use their own speech recognition and voices.
   street-core.js is a copy of academy/src/street-core.js, made by build.py. */
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { makeHandler } from "./handler.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const num = (v: string, def: number, lo: number, hi: number) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };

/* The database is reached with the project's secret key (or the legacy service-role key). */
function secretKey(): string {
  try { const k = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}"); if (k && k.default) return k.default; } catch { /* use the legacy key */ }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}
const sbUrl = env("SUPABASE_URL"), sbKey = secretKey();
async function db(fn: string, args: Record<string, unknown>){
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: sbKey };
  if (!sbKey.startsWith("sb_")) headers.Authorization = `Bearer ${sbKey}`;
  const r = await fetch(`${sbUrl}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${fn} ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const key = env("SUA_ANTHROPIC_KEY"), openai = env("SUA_OPENAI_KEY");
const model = env("SUA_RP_MODEL") || "claude-haiku-5-5";
Deno.serve(makeHandler({
  claude: key ? new Anthropic({ apiKey: key, maxRetries: 1, timeout: 90_000 }) : null,
  errors: {
    off: [Anthropic.AuthenticationError, Anthropic.PermissionDeniedError],
    busy: [Anthropic.RateLimitError, Anthropic.InternalServerError, Anthropic.APIConnectionError],
    bad: Anthropic.BadRequestError
  },
  voice: openai ? { key: openai, stt: env("SUA_STT_MODEL") || "gpt-4o-mini-transcribe", tts: env("SUA_TTS_MODEL") || "gpt-4o-mini-tts" } : null,
  db, model, coachModel: env("SUA_COACH_MODEL") || model,
  mine: num(env("SUA_RP_PER_DAY"), 6, 1, 50), team: num(env("SUA_RP_TEAM_DAY"), 150, 1, 5000),
  log: o => console.log(JSON.stringify(o))
}));
