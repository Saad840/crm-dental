import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Download, Plus, Save, Trash2, Star, ExternalLink, Pencil, Facebook, Instagram, Twitter, Youtube, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { exportClinic } from "@/lib/export";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/clinics/$id")({
  component: ClinicDetail,
});

const STATUSES = ["New", "Researching", "Contacted", "In Discussion", "Closed-Won", "Closed-Lost"] as const;
type Status = typeof STATUSES[number];
type Clinic = {
  id: string; clinic_name: string; website_url: string | null; phone_primary: string | null; phone_secondary: string | null;
  email_primary: string | null; email_secondary: string | null; street: string | null; city: string | null; state: string | null;
  google_map_url: string | null; google_reviews_count: number | null; google_rating: number | null; categories: string | null;
  additional_info: string | null; status: Status;
};

const PLATFORMS = ["Facebook", "Instagram", "Twitter", "YouTube", "LinkedIn"] as const;
type Platform = typeof PLATFORMS[number];
const platformIcon: Record<Platform, typeof Facebook> = { Facebook, Instagram, Twitter, YouTube: Youtube, LinkedIn: Linkedin };

function ClinicDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: clinic, isLoading } = useQuery({
    queryKey: ["clinic", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinics").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Clinic | null;
    },
  });

  const [form, setForm] = useState<Clinic | null>(null);
  useEffect(() => { if (clinic) setForm(clinic); }, [clinic]);

  const save = async () => {
    if (!form) return;
    const { id: _id, ...rest } = form;
    const { error } = await supabase.from("clinics").update(rest).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["clinic", id] });
      qc.invalidateQueries({ queryKey: ["clinics"] });
    }
  };

  if (isLoading || !form) {
    return <div className="p-6 md:p-8"><Skeleton className="h-64 w-full" /></div>;
  }
  if (!clinic) return <div className="p-8 text-sm text-muted-foreground">Clinic not found.</div>;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/clinics"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link></Button>
          <h1 className="text-2xl font-semibold tracking-tight">{form.clinic_name}</h1>
          <Badge variant="secondary">{form.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { try { await exportClinic(id); toast.success("Exported"); } catch (e) { toast.error((e as Error).message); } }}>
            <Download className="mr-2 h-4 w-4" /> Export Full Clinic History
          </Button>
          <Button onClick={save}><Save className="mr-2 h-4 w-4" /> Save</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Clinic Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Clinic Name"><Input value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} /></Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Website"><Input value={form.website_url ?? ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone (Primary)"><Input value={form.phone_primary ?? ""} onChange={(e) => setForm({ ...form, phone_primary: e.target.value })} /></Field>
                <Field label="Phone (Secondary)"><Input value={form.phone_secondary ?? ""} onChange={(e) => setForm({ ...form, phone_secondary: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email (Primary)"><Input value={form.email_primary ?? ""} onChange={(e) => setForm({ ...form, email_primary: e.target.value })} /></Field>
                <Field label="Email (Secondary)"><Input value={form.email_secondary ?? ""} onChange={(e) => setForm({ ...form, email_secondary: e.target.value })} /></Field>
              </div>
              <Field label="Street"><Input value={form.street ?? ""} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                <Field label="State"><Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
              </div>
              <Field label="Google Map URL"><Input value={form.google_map_url ?? ""} onChange={(e) => setForm({ ...form, google_map_url: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Google Rating"><Input type="number" step="0.1" value={form.google_rating ?? ""} onChange={(e) => setForm({ ...form, google_rating: e.target.value ? Number(e.target.value) : null })} /></Field>
                <Field label="Reviews Count"><Input type="number" value={form.google_reviews_count ?? ""} onChange={(e) => setForm({ ...form, google_reviews_count: e.target.value ? Number(e.target.value) : null })} /></Field>
              </div>
              <Field label="Categories"><Input value={form.categories ?? ""} onChange={(e) => setForm({ ...form, categories: e.target.value })} /></Field>
              <Field label="Additional Info"><Textarea rows={3} value={form.additional_info ?? ""} onChange={(e) => setForm({ ...form, additional_info: e.target.value })} /></Field>
              {form.google_rating != null && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {form.google_rating} · {form.google_reviews_count ?? 0} reviews</div>
              )}
              {form.website_url && (
                <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={form.website_url} target="_blank" rel="noreferrer">Visit website <ExternalLink className="h-3 w-3" /></a>
              )}
            </CardContent>
          </Card>

          <BusinessSocialsCard clinicId={id} />
        </div>

        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <Tabs defaultValue="staff">
              <TabsList><TabsTrigger value="staff">Staff</TabsTrigger><TabsTrigger value="outreach">Outreach</TabsTrigger></TabsList>
              <TabsContent value="staff" className="mt-4"><StaffTab clinicId={id} /></TabsContent>
              <TabsContent value="outreach" className="mt-4"><OutreachTab clinicId={id} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function BusinessSocialsCard({ clinicId }: { clinicId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["business-socials", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("socials").select("*").eq("clinic_id", clinicId).is("staff_id", null);
      if (error) throw error;
      return data;
    },
  });

  const byPlatform: Partial<Record<Platform, { id: string; url: string }>> = {};
  (data ?? []).forEach((s) => { byPlatform[s.platform as Platform] = { id: s.id, url: s.url }; });

  const [draft, setDraft] = useState<Record<Platform, string>>({ Facebook: "", Instagram: "", Twitter: "", YouTube: "", LinkedIn: "" });
  useEffect(() => {
    setDraft({
      Facebook: byPlatform.Facebook?.url ?? "",
      Instagram: byPlatform.Instagram?.url ?? "",
      Twitter: byPlatform.Twitter?.url ?? "",
      YouTube: byPlatform.YouTube?.url ?? "",
      LinkedIn: byPlatform.LinkedIn?.url ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = async () => {
    for (const p of PLATFORMS) {
      const existing = byPlatform[p];
      const url = draft[p].trim();
      if (existing && !url) {
        await supabase.from("socials").delete().eq("id", existing.id);
      } else if (existing && url && url !== existing.url) {
        await supabase.from("socials").update({ url }).eq("id", existing.id);
      } else if (!existing && url) {
        await supabase.from("socials").insert({ clinic_id: clinicId, platform: p, url, staff_id: null });
      }
    }
    toast.success("Socials updated");
    qc.invalidateQueries({ queryKey: ["business-socials", clinicId] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Business Socials</CardTitle>
        <Button size="sm" variant="outline" onClick={save}><Save className="mr-1 h-3 w-3" /> Save</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <Skeleton className="h-24 w-full" /> : PLATFORMS.map((p) => {
          const Icon = platformIcon[p];
          const current = byPlatform[p]?.url;
          return (
            <div key={p} className="space-y-1.5">
              <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {p}
                {current && <a href={current} target="_blank" rel="noreferrer" className="ml-auto text-primary hover:underline normal-case"><ExternalLink className="h-3 w-3" /></a>}
              </Label>
              <Input placeholder={`https://${p.toLowerCase()}.com/…`} value={draft[p]} onChange={(e) => setDraft({ ...draft, [p]: e.target.value })} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

type StaffRow = { id: string; full_name: string; role: string | null; email: string | null; linkedin_url: string | null; facebook_url: string | null; instagram_url: string | null; notes: string | null };
const emptyStaff = { full_name: "", role: "", email: "", linkedin_url: "", facebook_url: "", instagram_url: "", notes: "" };

function StaffTab({ clinicId }: { clinicId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["staff", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff").select("*").eq("clinic_id", clinicId).order("created_at");
      if (error) throw error;
      return data as StaffRow[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [s, setS] = useState(emptyStaff);

  const openNew = () => { setEditing(null); setS(emptyStaff); setOpen(true); };
  const openEdit = (m: StaffRow) => {
    setEditing(m);
    setS({ full_name: m.full_name, role: m.role ?? "", email: m.email ?? "", linkedin_url: m.linkedin_url ?? "", facebook_url: m.facebook_url ?? "", instagram_url: m.instagram_url ?? "", notes: m.notes ?? "" });
    setOpen(true);
  };

  const submit = async () => {
    if (editing) {
      const { error } = await supabase.from("staff").update(s).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Staff updated");
    } else {
      const { error } = await supabase.from("staff").insert({ ...s, clinic_id: clinicId });
      if (error) return toast.error(error.message);
      toast.success("Staff added");
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["staff", clinicId] });
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["staff", clinicId] }); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add Staff</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Staff" : "New Staff Member"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Full name</Label><Input value={s.full_name} onChange={(e) => setS({ ...s, full_name: e.target.value })} /></div>
              <div><Label>Role</Label><Input value={s.role} onChange={(e) => setS({ ...s, role: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} /></div>
              <div><Label>LinkedIn URL</Label><Input value={s.linkedin_url} onChange={(e) => setS({ ...s, linkedin_url: e.target.value })} /></div>
              <div><Label>Facebook URL</Label><Input value={s.facebook_url} onChange={(e) => setS({ ...s, facebook_url: e.target.value })} /></div>
              <div className="col-span-2"><Label>Instagram URL</Label><Input value={s.instagram_url} onChange={(e) => setS({ ...s, instagram_url: e.target.value })} /></div>
              <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={!s.full_name.trim()}>{editing ? "Save" : "Add"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-24 w-full" /> : (data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No staff yet.</p> : (
        <ul className="space-y-2">
          {data?.map((m) => (
            <li key={m.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{m.full_name} {m.role && <span className="text-muted-foreground font-normal">· {m.role}</span>}</div>
                  {m.email && <div className="text-sm text-muted-foreground">{m.email}</div>}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {m.linkedin_url && <a className="text-primary hover:underline" href={m.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                    {m.facebook_url && <a className="text-primary hover:underline" href={m.facebook_url} target="_blank" rel="noreferrer">Facebook</a>}
                    {m.instagram_url && <a className="text-primary hover:underline" href={m.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
                  </div>
                  {m.notes && <div className="mt-1 text-sm">{m.notes}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OutreachTab({ clinicId }: { clinicId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["outreach", clinicId],
    queryFn: async () => {
      const { data, error } = await supabase.from("outreach_timeline").select("*").eq("clinic_id", clinicId).order("date_logged", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [open, setOpen] = useState(false);
  const [o, setO] = useState({ type: "Email", notes: "", outcome: "", date_logged: toLocalInput(new Date()) });
  useEffect(() => { if (open) setO((p) => ({ ...p, date_logged: toLocalInput(new Date()) })); }, [open]);

  const add = async () => {
    const payload = { type: o.type, notes: o.notes, outcome: o.outcome, clinic_id: clinicId, date_logged: new Date(o.date_logged).toISOString() };
    const { error } = await supabase.from("outreach_timeline").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Logged"); setOpen(false); setO({ type: "Email", notes: "", outcome: "", date_logged: toLocalInput(new Date()) }); qc.invalidateQueries({ queryKey: ["outreach", clinicId] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Log Outreach</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Outreach Log</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type</Label>
                <Select value={o.type} onValueChange={(v) => setO({ ...o, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Email", "Call", "LinkedIn", "Meeting", "DM", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Date &amp; Time</Label><Input type="datetime-local" value={o.date_logged} onChange={(e) => setO({ ...o, date_logged: e.target.value })} /></div>
              <div><Label>Outcome</Label><Input value={o.outcome} onChange={(e) => setO({ ...o, outcome: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={3} value={o.notes} onChange={(e) => setO({ ...o, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={add}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Skeleton className="h-24 w-full" /> : (data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No outreach logged.</p> : (
        <ol className="relative space-y-3 border-l pl-5">
          {data?.map((r) => (
            <li key={r.id} className="relative">
              <span className="absolute -left-[27px] top-2 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
              <div className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{r.type}{r.outcome && <span className="ml-2 text-muted-foreground font-normal">· {r.outcome}</span>}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(r.date_logged), "MMM d, yyyy HH:mm")}</div>
                </div>
                {r.notes && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{r.notes}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
