/* Street practice by voice: the phone records the promoter, this turns it into text, and reads the couple's
   lines back in natural voices. Both run on OpenAI's audio API with the key in SUA_OPENAI_KEY. Without the key
   the phone uses its own speech recognition and voices instead. */

// deno-lint-ignore no-explicit-any
type Any = any;
export interface VoiceCfg { key: string; stt: string; tts: string; fetch?: typeof fetch; base?: string }

export class VoiceFail extends Error {
  code: string; status: number;
  constructor(code: string, status: number){ super(code); this.code = code; this.status = status; }
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

const fail = (status: number) => status === 401 || status === 403 ? new VoiceFail("noear", 503) : new VoiceFail("busy", 503);

/* The promoter's words. Names, places and the pitch's own words help the model spell them right. */
export async function transcribe(v: VoiceCfg, a: { bytes: Uint8Array; ext: string; type: string }, c: Any): Promise<string> {
  const f = new FormData();
  f.append("file", new Blob([a.bytes], { type: a.type }), `said.${a.ext}`);
  f.append("model", v.stt);
  f.append("language", c.lang === "es" ? "es" : "en");
  f.append("prompt", `A street promoter in Aruba talks to tourists${c.people?.length ? ` (${c.people.map((p: Any) => p.name).join(", ")})` : ""}. ` +
    "Words you may hear: Iberostar, Open House, timeshare, Palm Beach, Eagle Beach, Oranjestad, Riu, Hilton, Marriott, Hyatt, all-inclusive, breakfast, gift.");
  let r: Response;
  try {
    r = await (v.fetch || fetch)(`${v.base || "https://api.openai.com"}/v1/audio/transcriptions`,
      { method: "POST", headers: { Authorization: `Bearer ${v.key}` }, body: f, signal: AbortSignal.timeout(25_000) });
  } catch { throw new VoiceFail("busy", 503); }   // timeout or no connection
  if (!r.ok) throw fail(r.status);
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
  const r = await (v.fetch || fetch)(`${v.base || "https://api.openai.com"}/v1/audio/speech`, {
    method: "POST", headers: { Authorization: `Bearer ${v.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: v.tts, voice, input: text.slice(0, 1000), instructions, response_format: "mp3" }),
    signal: AbortSignal.timeout(25_000)
  });
  if (!r.ok) throw fail(r.status);
  return toB64(await r.arrayBuffer());
}
