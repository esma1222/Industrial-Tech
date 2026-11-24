// techspheres-signup
// Stores a whitepaper request and subscribes the person to the atares
// TechSpheres newsletter in Mailchimp (double opt-in: new members are added
// as "pending", so Mailchimp sends its confirmation e-mail).
//
// Secrets (Supabase dashboard > Edge Functions > Secrets):
//   MAILCHIMP_API_KEY        e.g. abc123...-us21 (the suffix is the data centre)
//   MAILCHIMP_AUDIENCE_ID    the audience (list) used by atares.team's newsletter form
// Optional:
//   MAILCHIMP_INTEREST_NAME  group to tick, default "atares TechSpheres"
//   ALLOWED_ORIGINS          comma-separated origins allowed to call this, default "*"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { crypto } from "jsr:@std/crypto@1.0.3";
import { encodeHex } from "jsr:@std/encoding@1.0.5/hex";

const CONSENT_TEXT =
  'I agree that atares GmbH may send me newsletters (atares TechSpheres) by e-mail. I can revoke this consent at any time free of charge by clicking on the "Unsubscribe" link, which I can find in every newsletter issue.';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SALUTATIONS = ["Mr", "Ms", "Mx"];

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function cors(req: Request): Record<string, string> {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "*").split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("origin") ?? "";
  const allow = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// ---- Mailchimp -----------------------------------------------------------
type MC = { base: string; auth: string; list: string };
let audienceMeta: { mergeTags: Set<string>; interestId: string | null } | null = null;

function mailchimp(): MC | null {
  const key = Deno.env.get("MAILCHIMP_API_KEY");
  const list = Deno.env.get("MAILCHIMP_AUDIENCE_ID");
  if (!key || !list || !key.includes("-")) return null;
  const dc = key.split("-").pop();
  return { base: `https://${dc}.api.mailchimp.com/3.0`, auth: "Basic " + btoa("anystring:" + key), list };
}

async function mc(c: MC, method: string, path: string, body?: unknown) {
  const res = await fetch(c.base + path, {
    method,
    headers: { Authorization: c.auth, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Mailchimp ${method} ${path.split("?")[0]}: ${res.status} ${data.title ?? ""} ${data.detail ?? ""}`.trim());
  return data;
}

async function loadAudienceMeta(c: MC) {
  if (audienceMeta) return audienceMeta;
  const fields = await mc(c, "GET", `/lists/${c.list}/merge-fields?count=100&fields=merge_fields.tag`);
  const mergeTags = new Set<string>((fields.merge_fields ?? []).map((f: { tag: string }) => f.tag));
  const wanted = (Deno.env.get("MAILCHIMP_INTEREST_NAME") ?? "atares TechSpheres").toLowerCase();
  let interestId: string | null = null;
  const cats = await mc(c, "GET", `/lists/${c.list}/interest-categories?count=100&fields=categories.id`);
  for (const cat of cats.categories ?? []) {
    const ints = await mc(c, "GET", `/lists/${c.list}/interest-categories/${cat.id}/interests?count=100&fields=interests.id,interests.name`);
    const hit = (ints.interests ?? []).find((i: { name: string }) => i.name.trim().toLowerCase() === wanted);
    if (hit) { interestId = hit.id; break; }
  }
  audienceMeta = { mergeTags, interestId };
  return audienceMeta;
}

async function subscribe(c: MC, r: Record<string, string>, tag: string) {
  const meta = await loadAudienceMeta(c);
  const hash = encodeHex(await crypto.subtle.digest("MD5", new TextEncoder().encode(r.email.toLowerCase())));
  const candidates: Record<string, string> = {
    FNAME: r.first_name, LNAME: r.last_name, SALUTATION: r.salutation,
    UNTERNEHMEN: r.company, POSITION: r.position,
    SPRACHE: r.language === "de" ? "Deutsch" : "English",
  };
  const merge_fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(candidates)) if (v && meta.mergeTags.has(k)) merge_fields[k] = v;

  const body: Record<string, unknown> = {
    email_address: r.email,
    status_if_new: "pending",
    merge_fields,
    language: r.language,
  };
  if (meta.interestId) body.interests = { [meta.interestId]: true };

  const path = `/lists/${c.list}/members/${hash}`;
  let member = await mc(c, "PUT", path, body);
  if (member.status === "unsubscribed" || member.status === "archived") {
    // They opted out before: ask for a fresh confirmation instead of re-subscribing silently.
    member = await mc(c, "PATCH", path, { status: "pending" });
  }
  await mc(c, "POST", `${path}/tags`, { tags: [{ name: tag, status: "active" }] }).catch(() => {});
  return member.status === "subscribed" ? "subscribed" : "pending_confirmation";
}

// ---- Handler ---------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  let p: Record<string, unknown>;
  try { p = await req.json(); } catch { return json(req, 400, { error: "Invalid JSON" }); }

  if (str(p.website, 200)) return json(req, 200, { ok: true, status: "pending_confirmation" }); // honeypot

  const r = {
    salutation: str(p.salutation, 10),
    first_name: str(p.first_name, 200),
    last_name: str(p.last_name, 200),
    email: str(p.email, 320).toLowerCase(),
    company: str(p.company, 200),
    position: str(p.position, 200),
    language: p.language === "de" ? "de" : "en",
    source: str(p.source, 200) || "Industrial Tech M&A 2026 Whitepaper",
    page_url: str(p.page_url, 2000),
  };
  if (!SALUTATIONS.includes(r.salutation)) return json(req, 400, { error: "salutation" });
  if (!r.first_name) return json(req, 400, { error: "first_name" });
  if (!r.last_name) return json(req, 400, { error: "last_name" });
  if (!EMAIL_RE.test(r.email)) return json(req, 400, { error: "email" });
  if (p.consent !== true) return json(req, 400, { error: "consent" });

  const { data: row, error } = await db.from("whitepaper_requests").insert({
    salutation: r.salutation, first_name: r.first_name, last_name: r.last_name, email: r.email,
    company: r.company || null, position: r.position || null,
    newsletter_opt_in: true, consent_text: CONSENT_TEXT,
    source: r.source, language: r.language, page_url: r.page_url || null,
  }).select("id").single();
  if (error) {
    console.error("insert failed", error);
    return json(req, 500, { error: "storage" });
  }

  const c = mailchimp();
  let status = "not_configured";
  let mcError: string | null = null;
  if (c) {
    try { status = await subscribe(c, r, r.source); }
    catch (e) { status = "error"; mcError = String(e).slice(0, 1000); console.error(mcError); }
  }
  await db.from("whitepaper_requests")
    .update({ mailchimp_status: status, mailchimp_error: mcError, mailchimp_synced_at: c ? new Date().toISOString() : null })
    .eq("id", row.id);

  // The lead is stored either way, so the visitor gets the whitepaper.
  return json(req, 200, { ok: true, status });
});
