import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/clinics/")({
  head: () => ({ meta: [{ title: "Clinics — Dental CRM" }] }),
  component: ClinicsList,
});

const STATUSES = ["New", "Researching", "Contacted", "In Discussion", "Closed-Won", "Closed-Lost"] as const;

function statusColor(s: string) {
  return {
    New: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    Researching: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    Contacted: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    "In Discussion": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    "Closed-Won": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    "Closed-Lost": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  }[s] ?? "";
}

function ClinicsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id,clinic_name,city,state,email_primary,phone_primary,status,last_synced_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = (data ?? []).filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (!q) return true;
    const hay = `${c.clinic_name} ${c.city ?? ""} ${c.email_primary ?? ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clinic Directory</h1>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} total · {filtered.length} shown</p>
        </div>
        <NewClinicDialog />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, city, email…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sync</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.clinic_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.email_primary || c.phone_primary || "—"}</TableCell>
                      <TableCell><Badge className={statusColor(c.status)} variant="secondary">{c.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.last_synced_at ? (
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {formatDistanceToNow(new Date(c.last_synced_at), { addSuffix: true })}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/clinics/$id" params={{ id: c.id }}>Open <ExternalLink className="ml-1 h-3 w-3" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No clinics found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewClinicDialog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("clinics").insert({ clinic_name: name.trim(), city: city || null, user_id: user.id });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Clinic added");
      setOpen(false);
      setName(""); setCity("");
      qc.invalidateQueries({ queryKey: ["clinics"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Clinic</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Clinic</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Clinic name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>City (optional)</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={create} disabled={busy || !name.trim()}>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
