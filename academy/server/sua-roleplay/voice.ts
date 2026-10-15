/* Street practice by voice: the phone records the promoter, this turns it into text, and reads the couple's
   lines back in natural voices. Both run on OpenAI's audio API with the key in SUA_OPENAI_KEY. Without the key
   the phone uses its own speech recognition and voices instead. */

// deno-lint-ignore no-explicit-any
type Any = any;
export interface VoiceCfg { key: string; stt: string; tts: string; live?: string; fetch?: typeof fetch; base?: string }

export class VoiceFail extends Error {
  code: string; status: number; detail: string;
  constructor(code: string, status: number, detail = ""){ super(code); this.code = code; this.status = status; this.detail = detail; }
}

const TYPES: Record<string, string> = { "audio/mp4": "mp4", "audio/x-m4a": "m4a", "audio/m4a": "m4a", "audio/aac": "m4a",
  "audio/webm": "webm", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav" };
export const MAX_AUDIO_B64 = 1_400_000;   // about 1 MB of audio: far more than 40 seconds at the phone's bitrate

export function audioIn(b64: unknown, mime: unknown): { bytes: Uint8Array; ext: string; type: string } | null {
  if (typeof b64 !== "string" || b64.length < 200 || b64.length > MAX_AUDIO_B64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return null;
  const type = String(mime || "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type]; if (!ext) return null;
  try { return { bytes: Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)), ext, type }; } catch { return null; }
}

export function toB64(buf: ArrayBuffer): string {
  const u = new Uint8Array(buf); let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

/* One POST to OpenAI. A hiccup on their side (5xx, a dropped connection) gets one more try after a short wait;
   anything else (bad key, no credits, bad request) comes straight back. The body is rebuilt for each try. */
async function post(v: VoiceCfg, path: string, init: () => RequestInit): Promise<Response> {
  for (let i = 0; ; i++){
    let r: Response | null = null;
    try { r = await (v.fetch || fetch)(`${v.base || "https://api.openai.com"}${path}`, { ...init(), signal: AbortSignal.timeout(25_000) }); }
    catch { if (i) throw new VoiceFail("busy", 503, "openai: no answer"); }
    if (r && (r.ok || r.status < 500 || i)) return r;
    await new Promise(res => setTimeout(res, 400));
  }
}

/* OpenAI said no. The log gets its status and error code (never the key) so a wrong model name or an empty
   balance shows up in the function logs. */
async function fail(r: Response): Promise<VoiceFail> {
  let why = "";
  try { const j = await r.json(); why = [j?.error?.code, j?.error?.type, String(j?.error?.message || "").slice(0, 160)].filter(Boolean).join(" | "); } catch { /* not JSON */ }
  const detail = `openai ${r.status}${why ? ": " + why : ""}`;
  // A bad key or an empty balance won't fix itself in a moment: the phone switches to its own voice or typing.
  const dead = r.status === 401 || r.status === 403 || /insufficient_quota|credit_balance_exhausted|billing/i.test(why);
  return new VoiceFail(dead ? "noear" : "busy", 503, detail);
}

/* The promoter's words. Names, places and the pitch's own words help the model spell them right. */
export async function transcribe(v: VoiceCfg, a: { bytes: Uint8Array; ext: string; type: string }, c: Any): Promise<string> {
  const f = new FormData();
  f.append("file", new Blob([a.bytes], { type: a.type }), `said.${a.ext}`);
  f.append("model", v.stt);
  f.append("language", c.lang === "es" ? "es" : "en");
  f.append("prompt", `A street promoter in Aruba talks to tourists${c.people?.length ? ` (${c.people.map((p: Any) => p.name).join(", ")})` : ""}. ` +
    "Words you may hear: Iberostar, Open House, timeshare, Palm Beach, Eagle Beach, Oranjestad, Riu, Hilton, Marriott, Hyatt, all-inclusive, breakfast, gift.");
  const r = await post(v, "/v1/audio/transcriptions", () => ({ method: "POST", headers: { Authorization: `Bearer ${v.key}` }, body: f }));
  if (!r.ok) throw await fail(r);
  const j = await r.json().catch(() => null);
  return String(j?.text ?? "").replace(/\s+/g, " ").trim();
}

/* Two men or two women get different voices. marin and cedar are OpenAI's most natural ones. */
export function voiceFor(c: Any, i: number): string {
  const p = c.people[i] || c.people[0];
  const other = c.people[1 - i];
  const second = !!other && other.sex === p.sex && i === 1;
  return p.sex === "m" ? (second ? "ash" : "cedar") : (second ? "coral" : "marin");
}

/* How they sound: age, accent, mood, and how this turn is going for them. */
export function styleFor(c: Any, i: number, interest?: number): string {
  const p = c.people[i] || c.people[0];
  const age = Number(p.age) || 40;
  const decade = age < 30 ? "in their twenties" : age >= 70 ? "in their seventies" : `in their ${Math.floor(age / 10) * 10}s`;
  const spanish = c.lang === "es" || (!c.sameLang && p.sex === "f");   // mixed pairs: he speaks English, she Spanish
  const accent = spanish
    ? (c.region === "ar" ? "Speak Argentine Spanish." : c.region === "us" || c.region === "ca" ? "Speak Puerto Rican Spanish." : "Speak Latin American Spanish.")
    : (c.region === "ca" ? "Canadian accent." : c.region === "us" ? "American accent." : c.region === "eu" ? "A light European accent in English."
      : c.region === "ar" || c.region === "latam" ? "A light Latin American accent in English." : "A natural accent in English.");
  const mood: Record<string, string> = { friendly: "relaxed and friendly", chatty: "chatty and warm", skeptical: "polite but skeptical",
    hurry: "in a hurry, a bit clipped", brush: "not keen to stop, short", split: c.keen === i ? "curious and keen" : "reluctant" };
  const now = interest == null ? "" : interest <= 3 ? " Right now a little guarded." : interest >= 7 ? " Right now warming up and interested." : "";
  return `A tourist on vacation in Aruba, ${p.sex === "m" ? "a man" : "a woman"} ${decade}, stopped on the street by a promoter. ` +
    `Talk like a real person in a casual chat, not like an announcer: natural pace, small pauses. ${accent} Mood: ${mood[c.mood] || "relaxed"}.${now}`;
}

export async function speak(v: VoiceCfg, text: string, voice: string, instructions: string): Promise<string> {
  const r = await post(v, "/v1/audio/speech", () => ({
    method: "POST", headers: { Authorization: `Bearer ${v.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: v.tts, voice, input: text.slice(0, 1000), instructions, response_format: "mp3" })
  }));
  if (!r.ok) throw await fail(r);
  return toB64(await r.arrayBuffer());
}

/* A live call: an ephemeral key for one speech-to-speech session (OpenAI Realtime). The phone connects to OpenAI
   with it directly (WebRTC), so the audio never passes through here. The key can only start a session for the
   next minute; the session itself carries the couple's instructions and can't be changed into anything else. */
export async function liveKey(v: VoiceCfg, o: { instructions: string; voice: string; lang: string; names: string[]; tool: Any }): Promise<{ key: string; expires: number; model: string }> {
  const model = v.live || "gpt-realtime-2.1-mini";
  const session = (effort: boolean) => ({
    expires_after: { anchor: "created_at", seconds: 60 },
    session: {
      type: "realtime", model, instructions: o.instructions, output_modalities: ["audio"], max_output_tokens: 600,
      ...(effort ? { reasoning: { effort: "minimal" } } : {}),
      audio: {
        input: {
          noise_reduction: { type: "near_field" },
          transcription: { model: v.stt, language: o.lang === "es" ? "es" : "en",
            prompt: `A street promoter in Aruba talks to tourists (${o.names.join(", ")}). Iberostar, Open House, timeshare, Palm Beach, Eagle Beach, Joia, breakfast, gift.` },
          turn_detection: { type: "semantic_vad", eagerness: "high", create_response: true, interrupt_response: true }
        },
        output: { voice: o.voice }
      },
      tools: [o.tool], tool_choice: "auto"
    }
  });
  let r = await post(v, "/v1/realtime/client_secrets", () => ({ method: "POST", headers: { Authorization: `Bearer ${v.key}`, "Content-Type": "application/json" }, body: JSON.stringify(session(true)) }));
  // Some models take no reasoning setting: ask once more without it.
  if (r.status === 400) r = await post(v, "/v1/realtime/client_secrets", () => ({ method: "POST", headers: { Authorization: `Bearer ${v.key}`, "Content-Type": "application/json" }, body: JSON.stringify(session(false)) }));
  if (!r.ok) throw await fail(r);
  const j = await r.json().catch(() => null);
  const key = String(j?.value || j?.client_secret?.value || "");
  if (!key) throw new VoiceFail("busy", 503, "openai: no client secret in reply");
  return { key, expires: Number(j?.expires_at || 0), model };
}
