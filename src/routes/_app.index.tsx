import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Activity, CheckCircle2, XCircle, Download, TrendingUp } from "lucide-react";
import { exportAll } from "@/lib/export";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from "date-fns";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard — Dental CRM" }] }),
  component: Dashboard,
});

const STATUSES = ["New", "Researching", "Contacted", "In Discussion", "Closed-Won", "Closed-Lost"] as const;
const STATUS_COLORS: Record<string, string> = {
  New: "bg-slate-500",
  Researching: "bg-blue-500",
  Contacted: "bg-amber-500",
  "In Discussion": "bg-violet-500",
  "Closed-Won": "bg-emerald-500",
  "Closed-Lost": "bg-rose-500",
};

function toInput(d: Date) { return format(d, "yyyy-MM-dd"); }

function Dashboard() {
  const [from, setFrom] = useState(toInput(subDays(new Date(), 29)));
  const [to, setTo] = useState(toInput(new Date()));

  const range = useMemo(() => ({
    start: startOfDay(new Date(from)).toISOString(),
    end: endOfDay(new Date(to)).toISOString(),
  }), [from, to]);

  const { data: totals, isLoading: loadingTotals } = useQuery({
    queryKey: ["dashboard-totals"],
    queryFn: async () => {
      const [clinics, staff] = await Promise.all([
        supabase.from("clinics").select("id,status,updated_at"),
        supabase.from("staff").select("id"),
      ]);
      const byStatus: Record<string, number> = {};
      clinics.data?.forEach((c) => (byStatus[c.status] = (byStatus[c.status] ?? 0) + 1));
      return { total: clinics.data?.length ?? 0, staff: staff.data?.length ?? 0, byStatus };
    },
  });

  const { data: ranged, isLoading: loadingRanged } = useQuery({
    queryKey: ["dashboard-ranged", range.start, range.end],
    queryFn: async () => {
      const [outreach, won, lost, newClinics] = await Promise.all([
        supabase.from("outreach_timeline").select("id,type,outcome,notes,date_logged,clinic_id,clinics(clinic_name,status)").gte("date_logged", range.start).lte("date_logged", range.end).order("date_logged", { ascending: false }),
        supabase.from("clinics").select("id,clinic_name,updated_at").eq("status", "Closed-Won").gte("updated_at", range.start).lte("updated_at", range.end),
        supabase.from("clinics").select("id,clinic_name,updated_at").eq("status", "Closed-Lost").gte("updated_at", range.start).lte("updated_at", range.end),
        supabase.from("clinics").select("id,created_at").gte("created_at", range.start).lte("created_at", range.end),
      ]);
      return {
        outreach: outreach.data ?? [],
        won: won.data ?? [],
        lost: lost.data ?? [],
        newClinics: newClinics.data ?? [],
      };
    },
  });

  const series = useMemo(() => {
    if (!ranged) return [] as { date: string; count: number }[];
    const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });
    const byDay = new Map<string, number>();
    ranged.outreach.forEach((o) => {
      const k = format(new Date(o.date_logged), "yyyy-MM-dd");
      byDay.set(k, (byDay.get(k) ?? 0) + 1);
    });
    return days.map((d) => ({ date: format(d, "MMM d"), count: byDay.get(format(d, "yyyy-MM-dd")) ?? 0 }));
  }, [ranged, from, to]);

  const maxBar = Math.max(1, ...series.map((s) => s.count));
  const byType: Record<string, number> = {};
  ranged?.outreach.forEach((o) => (byType[o.type] = (byType[o.type] ?? 0) + 1));
  const conversionRate = ranged && (ranged.won.length + ranged.lost.length) > 0
    ? Math.round((ranged.won.length / (ranged.won.length + ranged.lost.length)) * 100)
    : 0;

  const doExport = async () => {
    try { await exportAll(); toast.success("Export downloaded"); } catch (e) { toast.error((e as Error).message); }
  };

  const setPreset = (days: number) => {
    setFrom(toInput(subDays(new Date(), days - 1)));
    setTo(toInput(new Date()));
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Pipeline overview &amp; performance.</p>
        </div>
        <Button onClick={doExport}><Download className="mr-2 h-4 w-4" /> Download Data</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">Start date</Label>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-[170px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground">End date</Label>
            <Input type="date" value={to} min={from} max={toInput(new Date())} onChange={(e) => setTo(e.target.value)} className="w-[170px]" />
          </div>
          <div className="flex gap-1">
            {[{ l: "7d", d: 7 }, { l: "30d", d: 30 }, { l: "90d", d: 90 }].map((p) => (
              <Button key={p.l} variant="outline" size="sm" onClick={() => setPreset(p.d)}>{p.l}</Button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">Range: {format(new Date(from), "MMM d")} – {format(new Date(to), "MMM d, yyyy")}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Building2} label="Total Clinics" value={totals?.total} sub={`${ranged?.newClinics.length ?? 0} new in range`} loading={loadingTotals} />
        <Kpi icon={Activity} label="Outreach in Range" value={ranged?.outreach.length} loading={loadingRanged} />
        <Kpi icon={CheckCircle2} label="Closed-Won" value={ranged?.won.length} sub={`${conversionRate}% win rate`} loading={loadingRanged} tone="emerald" />
        <Kpi icon={XCircle} label="Closed-Lost" value={ranged?.lost.length} loading={loadingRanged} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Outreach Activity</CardTitle></CardHeader>
          <CardContent>
            {loadingRanged ? <Skeleton className="h-48 w-full" /> : (
              <div className="flex h-48 items-end gap-1">
                {series.map((s, i) => (
                  <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div className="absolute -top-6 hidden rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">{s.count}</div>
                    <div className="w-full rounded-t bg-primary/70 transition-all hover:bg-primary" style={{ height: `${(s.count / maxBar) * 100}%`, minHeight: s.count > 0 ? 4 : 1 }} />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{series[0]?.date}</span>
              <span>{series[Math.floor(series.length / 2)]?.date}</span>
              <span>{series[series.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline by Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {STATUSES.map((s) => {
              const count = totals?.byStatus[s] ?? 0;
              const pct = totals?.total ? (count / totals.total) * 100 : 0;
              return (
                <div key={s} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{s}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${STATUS_COLORS[s]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Outreach by Type</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(byType).length === 0 ? <p className="text-sm text-muted-foreground">No outreach in this range.</p> : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                  <Badge key={t} variant="secondary" className="text-sm">{t}: <span className="ml-1 font-semibold">{n}</span></Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Closed Deals in Range</CardTitle></CardHeader>
          <CardContent>
            {loadingRanged ? <Skeleton className="h-24 w-full" /> : (ranged?.won.length === 0 && ranged?.lost.length === 0) ? (
              <p className="text-sm text-muted-foreground">No deals closed in this range.</p>
            ) : (
              <ul className="divide-y">
                {[...(ranged?.won ?? []).map((w) => ({ ...w, status: "Won" as const })), ...(ranged?.lost ?? []).map((w) => ({ ...w, status: "Lost" as const }))]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .slice(0, 8)
                  .map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate font-medium">{d.clinic_name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className={d.status === "Won" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300"}>{d.status}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(d.updated_at), "MMM d")}</span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {loadingRanged ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (ranged?.outreach.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No outreach logged in this range.</p>
          ) : (
            <ul className="divide-y">
              {ranged?.outreach.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {(r as { clinics?: { clinic_name?: string } }).clinics?.clinic_name ?? "Clinic"} · {r.type}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{r.outcome || r.notes}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">{format(new Date(r.date_logged), "MMM d, HH:mm")}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, loading, tone }: { icon: typeof Building2; label: string; value: number | undefined; sub?: string; loading: boolean; tone?: "emerald" | "rose" }) {
  const toneCls = tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneCls}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {loading ? <Skeleton className="mt-1 h-6 w-12" /> : <div className="text-2xl font-semibold">{value ?? 0}</div>}
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
