/* Street practice: the request handler. index.ts wires in the Anthropic SDK and the database;
   tests wire in mocks. Every reply to the phone is { err } or the data it asked for. */
import "./street-core.js";

// deno-lint-ignore no-explicit-any
const RP = (globalThis as any).RPCORE;
// deno-lint-ignore no-explicit-any
type Couple = any; type LogEntry = any; type Reply = any; type Coach = any;

export const MAX_TURNS = 24;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGINS = ["https://victorfromaruba-stack.github.io", "http://localhost", "http://127.0.0.1"];

// deno-lint-ignore no-explicit-any
type Any = any;
export interface Deps {
  claude: Any | null;                               // Anthropic client; null while no key is set
  errors: { off: Any[]; busy: Any[]; bad: Any };    // SDK error classes, checked with instanceof
  db: (fn: string, args: Record<string, unknown>) => Promise<Any>;
  model: string; coachModel: string; mine: number; team: number;
  log: (o: Record<string, unknown>) => void;
}

class Fail extends Error {
  code: string; status: number;
  constructor(code: string, status: number){ super(code); this.code = code; this.status = status; }
}

function cors(req: Request): Record<string, string> {
  const o = req.headers.get("Origin") || "";
  const ok = ORIGINS.some(x => o === x || o.startsWith(x + ":"));
  return { "Access-Control-Allow-Origin": ok ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
           "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const json = (data: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(data), { status, headers: { ...h, "Content-Type": "application/json" } });
const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const ERR_STATUS: Record<string, number> = { auth: 401, limit: 429, team: 429, nochat: 404, over: 409, busy: 503, off: 503 };

export function makeHandler(d: Deps){
  /* Opus and Sonnet can hand a declined request to another model; Haiku 5.5 can't, so it gets no fallbacks. */
  const fallback = (model: string) => /haiku/.test(model) ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

  async function ask(params: Record<string, unknown>, model: string, what: string){
    const t0 = Date.now();
    let res: Any;
    try { res = await d.claude.beta.messages.create({ model, ...fallback(model), ...params }); }
    catch (e){
      // If the fallback opt-in is ever refused, try once without it rather than failing the chat.
      if (e instanceof d.errors.bad && !/haiku/.test(model)){
        d.log({ what, retry: "no-fallbacks", status: (e as Any).status, msg: String((e as Error).message || "").slice(0, 300) });
        res = await d.claude.beta.messages.create({ model, ...params });
      } else throw e;
    }
    const u = res.usage || {};
    d.log({ what, model: res.model, ms: Date.now() - t0, stop: res.stop_reason, in: u.input_tokens, out: u.output_tokens,
            cache_read: u.cache_read_input_tokens, cache_write: u.cache_creation_input_tokens });
    if (res.stop_reason === "refusal") throw new Fail("refused", 422);
    if (res.stop_reason === "max_tokens") throw new Fail("cut", 502);
    const text = (res.content || []).find((b: Any) => b.type === "text")?.text;
    try { return JSON.parse(text); } catch { throw new Fail("garbled", 502); }
  }

  async function askCouple(c: Couple, log: LogEntry[], text: string, wrapUp: boolean): Promise<Reply> {
    const msgs = RP.toMessages(log, text, wrapUp).map((m: Any, i: number, all: Any[]) => ({
      role: m.role,
      // Same block shape every turn so the cached prefix matches; the newest turn carries the cache marker.
      content: [{ type: "text", text: m.content, ...(i === all.length - 1 ? { cache_control: { type: "ephemeral" } } : {}) }]
    }));
    const raw = await ask({
      max_tokens: 3000,
      output_config: { effort: "low", format: { type: "json_schema", schema: RP.TURN_SCHEMA } },
      system: [{ type: "text", text: RP.COUPLE_RULES, cache_control: { type: "ephemeral" } }, { type: "text", text: RP.brief(c) }],
      messages: msgs
    }, d.model, "turn");
    const r = RP.normReply(raw, c.people.length === 1);
    if (!r) throw new Fail("garbled", 502);
    return r;
  }

  async function askCoach(c: Couple, log: LogEntry[], call: string): Promise<Coach> {
    const raw = await ask({
      max_tokens: 8000,
      output_config: { effort: "medium", format: { type: "json_schema", schema: RP.COACH_SCHEMA } },
      system: [{ type: "text", text: RP.COACH_RULES, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: RP.coachInput(c, log, call) }]
    }, d.coachModel, "coach");
    const r = RP.normCoach(raw);
    if (!r) throw new Fail("garbled", 502);
    return r;
  }

  const dbErr = (r: Any) => { if (r && r.err) throw new Fail(r.err, ERR_STATUS[r.err] || 400); return r; };

  return async function handle(req: Request): Promise<Response> {
    const h = cors(req);
    if (req.method === "OPTIONS") return new Response("ok", { headers: h });
    if (req.method !== "POST") return json({ err: "bad" }, 405, h);
    let body: Any;
    try {
      const raw = await req.text();
      if (raw.length > 20000) return json({ err: "bad" }, 413, h);
      body = JSON.parse(raw);
    } catch { return json({ err: "bad" }, 400, h); }
    if (!body || typeof body !== "object") return json({ err: "bad" }, 400, h);
    const op = String(body.op || "");
    if (!d.claude) return json({ err: "off" }, 503, h);
    const device = String(body.device || ""), secret = String(body.secret || "");
    if (!UUID.test(device) || secret.length < 20 || secret.length > 100) return json({ err: "auth" }, 401, h);
    const who = { p_device: device, p_secret: secret };

    try {
      if (op === "status"){
        const u = dbErr(await d.db("sua_rp_status", who));
        return json({ on: true, left: Math.max(0, d.mine - Number(u.mine || 0)), teamFull: Number(u.team || 0) >= d.team }, 200, h);
      }

      if (op === "start"){
        const focus = RP.FOCUS.includes(body.focus) ? body.focus : "any";
        const c = RP.makeCouple(focus, body.lang === "es" ? "es" : "en");
        const r = dbErr(await d.db("sua_rp_start", { ...who, p_couple: c, p_mine: d.mine, p_team: d.team }));
        return json({ chat: r.chat, left: r.left, max: MAX_TURNS, scene: RP.sceneOut(c) }, 200, h);
      }

      const chat = String(body.chat || "");
      if (!UUID.test(chat)) return json({ err: "bad" }, 400, h);

      if (op === "turn"){
        const text = clean(body.text, 600);
        if (!text) return json({ err: "bad" }, 400, h);
        const r = dbErr(await d.db("sua_rp_load", { ...who, p_chat: chat, p_mine: d.mine, p_team: d.team }));
        if (r.state !== "talking" || r.turns >= MAX_TURNS) throw new Fail("over", 409);
        const c = r.couple as Couple, log = (r.log || []) as LogEntry[];
        const reply = await askCouple(c, log, text, r.turns + 1 >= MAX_TURNS - 1);
        if (r.turns + 1 >= MAX_TURNS && reply.state === "talking") reply.state = "ended";
        const ok = await d.db("sua_rp_save", { p_chat: chat, p_turns: r.turns, p_log: [...log, { o: text }, { c: reply }], p_state: reply.state });
        if (ok !== true) throw new Fail("busy", 409);
        return json({ lines: reply.lines, cue: reply.cue, state: reply.state, booked: reply.booked, turns: r.turns + 1, max: MAX_TURNS }, 200, h);
      }

      if (op === "coach"){
        const call = ["Q", "CT", "NQ", "?"].includes(body.call) ? body.call : "?";
        const r = dbErr(await d.db("sua_rp_load", { ...who, p_chat: chat, p_mine: d.mine, p_team: d.team }));
        const c = r.couple as Couple, log = (r.log || []) as LogEntry[];
        if (!log.some((e: Any) => "c" in e)) return json({ err: "short" }, 400, h);
        let coach: Coach | null = r.coach && r.coach.coach ? r.coach.coach : null;
        const usedCall = coach ? r.coach.call : call;
        if (!coach){
          coach = await askCoach(c, log, call);
          await d.db("sua_rp_coach_save", { p_chat: chat, p_coach: { coach, call } });
        }
        return json({ coach, call: usedCall, reveal: RP.revealOut(c), timeline: RP.timelineOf(log), end: RP.endOf(log) }, 200, h);
      }

      return json({ err: "bad" }, 400, h);
    } catch (e){
      if (e instanceof Fail) return json({ err: e.code }, e.status, h);
      if (d.errors.off.some(k => e instanceof k)){ d.log({ op, error: "anthropic-auth", status: (e as Any).status }); return json({ err: "off" }, 503, h); }
      if (d.errors.busy.some(k => e instanceof k)){ d.log({ op, error: "anthropic-busy", status: (e as Any).status }); return json({ err: "busy" }, 503, h); }
      d.log({ op, error: String((e as Error)?.message || e).slice(0, 300) });
      return json({ err: "error" }, 500, h);
    }
  };
}
