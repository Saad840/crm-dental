// Receives JSON rows from Google Sheets and upserts clinics + staff + socials.
// Public endpoint (verify_jwt = false). Optional `x-sync-token` header check against SHEET_SYNC_TOKEN.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Row = Record<string, unknown>;

const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) {
    const found = Object.keys(r).find((rk) => rk.toLowerCase().trim() === k.toLowerCase().trim());
    if (found != null && r[found] !== "" && r[found] != null) return r[found];
  }
  return null;
};
const str = (v: unknown) => (v == null ? null : String(v).trim() || null);
const num = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const SOCIAL_FIELDS: Array<[string, "Facebook" | "Instagram" | "Twitter" | "YouTube" | "LinkedIn"]> = [
  ["business_facebook", "Facebook"],
  ["business_Instagram", "Instagram"],
  ["business_Twitter", "Twitter"],
  ["business_Youtube", "YouTube"],
  ["business_LinkedIn", "LinkedIn"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const expectedToken = Deno.env.get("SHEET_SYNC_TOKEN");
  if (expectedToken) {
    const got = req.headers.get("x-sync-token");
    if (got !== expectedToken) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: { rows?: Row[]; user_id?: string };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) return new Response(JSON.stringify({ inserted: 0, updated: 0, errors: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Resolve target user_id: explicit override, or fall back to the single seeded user.
  let userId = body.user_id ?? null;
  if (!userId) {
    const { data: u } = await admin.from("clinics").select("user_id").limit(1).maybeSingle();
    if (u?.user_id) userId = u.user_id;
    else {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      userId = list?.users?.[0]?.id ?? null;
    }
  }
  if (!userId) return new Response(JSON.stringify({ error: "no user found to assign" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let inserted = 0, updated = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const clinic_name = str(pick(r, "Title", "clinic_name", "name"));
      if (!clinic_name) { errors.push({ row: i, error: "missing Title/clinic_name" }); continue; }

      const payload = {
        user_id: userId,
        clinic_name,
        google_rating: num(pick(r, "Google map reviews", "google_rating")),
        google_reviews_count: num(pick(r, "reviewsCount", "google_reviews_count")),
        street: str(pick(r, "street")),
        city: str(pick(r, "city")),
        state: str(pick(r, "state")),
        website_url: str(pick(r, "website", "website_url")),
        phone_primary: str(pick(r, "phone Primaryurl", "phone primary", "phone_primary")),
        phone_secondary: str(pick(r, "phone secondary", "phone_secondary")),
        email_primary: str(pick(r, "email primary", "email_primary")),
        email_secondary: str(pick(r, "email secondary", "email_secondary")),
        categories: str(pick(r, "categories")),
        google_map_url: str(pick(r, "google_map_url", "map_url")),
        additional_info: str(pick(r, "additional_info", "notes")),
        last_synced_at: new Date().toISOString(),
      };

      // Check existing
      const { data: existing } = await admin.from("clinics").select("id").eq("user_id", userId).eq("clinic_name", clinic_name).maybeSingle();
      let clinicId: string;
      if (existing?.id) {
        const { error } = await admin.from("clinics").update(payload).eq("id", existing.id);
        if (error) throw error;
        clinicId = existing.id;
        updated++;
      } else {
        const { data, error } = await admin.from("clinics").insert(payload).select("id").single();
        if (error) throw error;
        clinicId = data.id;
        inserted++;
      }

      // Business socials
      for (const [key, platform] of SOCIAL_FIELDS) {
        const url = str(pick(r, key));
        if (!url) continue;
        const { data: ex } = await admin.from("socials").select("id").eq("clinic_id", clinicId).is("staff_id", null).eq("platform", platform).maybeSingle();
        if (ex?.id) await admin.from("socials").update({ url }).eq("id", ex.id);
        else await admin.from("socials").insert({ clinic_id: clinicId, platform, url });
      }

      // Dentist
      const dentistName = str(pick(r, "Dentist"));
      if (dentistName) await upsertStaff(admin, clinicId, { full_name: dentistName, role: "Dentist" });

      // Numbered staff Staff_name1..N
      const indices = new Set<string>();
      for (const k of Object.keys(r)) {
        const m = k.match(/^staff_name(\d+)$/i);
        if (m) indices.add(m[1]);
      }
      for (const idx of indices) {
        const name = str(pick(r, `Staff_name${idx}`));
        if (!name) continue;
        const staffId = await upsertStaff(admin, clinicId, {
          full_name: name,
          role: str(pick(r, `Staff_role${idx}`)) ?? null,
          facebook_url: str(pick(r, `Staff_facebook${idx}`)),
          linkedin_url: str(pick(r, `Staff_linkedin${idx}`)),
          instagram_url: str(pick(r, `Staff_instagram${idx}`)),
          email: str(pick(r, `Staff_email${idx}`)),
        });
        const fb = str(pick(r, `Staff_facebook${idx}`));
        const li = str(pick(r, `Staff_linkedin${idx}`));
        const ig = str(pick(r, `Staff_instagram${idx}`));
        if (staffId) {
          if (fb) await upsertSocial(admin, clinicId, staffId, "Facebook", fb);
          if (li) await upsertSocial(admin, clinicId, staffId, "LinkedIn", li);
          if (ig) await upsertSocial(admin, clinicId, staffId, "Instagram", ig);
        }
      }
    } catch (e) {
      errors.push({ row: i, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ inserted, updated, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

async function upsertStaff(admin: ReturnType<typeof createClient>, clinicId: string, s: { full_name: string; role?: string | null; email?: string | null; linkedin_url?: string | null; facebook_url?: string | null; instagram_url?: string | null }) {
  const { data: ex } = await admin.from("staff").select("id").eq("clinic_id", clinicId).eq("full_name", s.full_name).maybeSingle();
  if (ex?.id) {
    await admin.from("staff").update({ ...s, clinic_id: clinicId }).eq("id", ex.id);
    return ex.id as string;
  }
  const { data, error } = await admin.from("staff").insert({ ...s, clinic_id: clinicId }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function upsertSocial(admin: ReturnType<typeof createClient>, clinicId: string, staffId: string, platform: string, url: string) {
  const { data: ex } = await admin.from("socials").select("id").eq("clinic_id", clinicId).eq("staff_id", staffId).eq("platform", platform).maybeSingle();
  if (ex?.id) await admin.from("socials").update({ url }).eq("id", ex.id);
  else await admin.from("socials").insert({ clinic_id: clinicId, staff_id: staffId, platform, url });
}
