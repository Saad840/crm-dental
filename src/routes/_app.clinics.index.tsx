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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, ExternalLink, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/clinics/")({
  head: () => ({ meta: [{ title: "Clinics - Dental CRM" }] }),
  component: ClinicsList,
});

const STATUSES = ["New", "Researching", "Contacted", "In Discussion", "Closed-Won", "Closed-Lost"] as const;
const DIRECTORY_COLUMNS = [
  { key: "clinic", label: "Clinic" },
  { key: "location", label: "Location" },
  { key: "contact", label: "Contact" },
  { key: "status", label: "Status" },
  { key: "sync", label: "Sync" },
  { key: "website", label: "Website" },
  { key: "rating", label: "Rating" },
  { key: "categories", label: "Categories" },
  { key: "updated", label: "Updated" },
] as const;
type DirectoryColumn = typeof DIRECTORY_COLUMNS[number]["key"];
const DEFAULT_COLUMNS: DirectoryColumn[] = ["clinic", "location", "contact", "status", "sync"];
const COLUMN_STORAGE_KEY = "clinic-directory-columns";

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

function getInitialColumns() {
  if (typeof window === "undefined") return DEFAULT_COLUMNS;
  const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY);
  if (!raw) return DEFAULT_COLUMNS;
  try {
    const parsed = JSON.parse(raw) as DirectoryColumn[];
    const valid = parsed.filter((c) => DIRECTORY_COLUMNS.some((col) => col.key === c));
    return valid.length ? valid : DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

function ClinicsList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [visibleColumns, setVisibleColumns] = useState<DirectoryColumn[]>(getInitialColumns);
  const { data, isLoading } = useQuery({
    queryKey: ["clinics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id,clinic_name,city,state,email_primary,email_secondary,phone_primary,phone_secondary,status,last_synced_at,updated_at,website_url,google_rating,google_reviews_count,categories")
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
  const show = (column: DirectoryColumn) => visibleColumns.includes(column);
  const setColumn = (column: DirectoryColumn, checked: boolean) => {
    const next = checked ? [...visibleColumns, column] : visibleColumns.filter((c) => c !== column);
    const safe = next.length ? next : ["clinic"];
    setVisibleColumns(safe);
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(safe));
  };

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
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, city, email..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2"><SlidersHorizontal className="h-4 w-4" /> Columns</Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Show fields</Label>
                  {DIRECTORY_COLUMNS.map((column) => (
                    <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-muted">
                      <Checkbox checked={show(column.key)} onCheckedChange={(checked) => setColumn(column.key, checked === true)} />
                      {column.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {show("clinic") && <TableHead>Clinic</TableHead>}
                    {show("location") && <TableHead>Location</TableHead>}
                    {show("contact") && <TableHead>Contact</TableHead>}
                    {show("status") && <TableHead>Status</TableHead>}
                    {show("sync") && <TableHead>Sync</TableHead>}
                    {show("website") && <TableHead>Website</TableHead>}
                    {show("rating") && <TableHead>Rating</TableHead>}
                    {show("categories") && <TableHead>Categories</TableHead>}
                    {show("updated") && <TableHead>Updated</TableHead>}
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      {show("clinic") && <TableCell className="font-medium">{c.clinic_name}</TableCell>}
                      {show("location") && <TableCell className="text-sm text-muted-foreground">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>}
                      {show("contact") && <TableCell className="text-sm text-muted-foreground">{c.email_primary || c.email_secondary || c.phone_primary || c.phone_secondary || "—"}</TableCell>}
                      {show("status") && <TableCell><Badge className={statusColor(c.status)} variant="secondary">{c.status}</Badge></TableCell>}
                      {show("sync") && (
                        <TableCell className="text-xs text-muted-foreground">
                          {c.last_synced_at ? (
                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {formatDistanceToNow(new Date(c.last_synced_at), { addSuffix: true })}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Manual</span>
                          )}
                        </TableCell>
                      )}
                      {show("website") && <TableCell className="text-sm text-muted-foreground">{c.website_url ? <a href={c.website_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open</a> : "—"}</TableCell>}
                      {show("rating") && <TableCell className="text-sm text-muted-foreground">{c.google_rating ? `${c.google_rating} (${c.google_reviews_count ?? 0})` : "—"}</TableCell>}
                      {show("categories") && <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{c.categories || "—"}</TableCell>}
                      {show("updated") && <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}</TableCell>}
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/clinics/$id" params={{ id: c.id }}>Open <ExternalLink className="ml-1 h-3 w-3" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={visibleColumns.length + 1} className="py-10 text-center text-sm text-muted-foreground">No clinics found.</TableCell></TableRow>
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
      setName("");
      setCity("");
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
