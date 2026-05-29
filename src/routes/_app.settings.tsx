import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Dental CRM" }] }),
  component: Settings,
});

function Settings() {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-sheet-sync`;
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  const appsScript = `// Google Apps Script — paste in your Sheet (Extensions → Apps Script)
function syncToCRM() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const [headers, ...rows] = sheet.getDataRange().getValues();
  const data = rows.map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
  const res = UrlFetchApp.fetch("${url}", {
    method: "post",
    contentType: "application/json",
    headers: { "x-sync-token": "OPTIONAL_TOKEN" },
    payload: JSON.stringify({ rows: data })
  });
  Logger.log(res.getContentText());
}`;

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure Google Sheets bidirectional sync.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync with Google Sheets</CardTitle>
          <CardDescription>POST clinic rows from your sheet to the endpoint below. The function upserts by clinic name and creates linked staff &amp; social rows automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Webhook URL</Label>
            <div className="mt-1 flex gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(url)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Optional sync token header</Label>
            <p className="mt-1 text-xs text-muted-foreground">Set a <code className="rounded bg-muted px-1">SHEET_SYNC_TOKEN</code> backend secret to require an <code className="rounded bg-muted px-1">x-sync-token</code> header. Left unset, the endpoint accepts any anonymous POST.</p>
          </div>
          <div>
            <Label>Sample Google Apps Script</Label>
            <Textarea readOnly value={appsScript} rows={12} className="mt-1 font-mono text-xs" />
            <div className="mt-2"><Button variant="outline" size="sm" onClick={() => copy(appsScript)}><Copy className="mr-1 h-4 w-4" /> Copy script</Button></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Expected Sheet Headers</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-mono text-muted-foreground">
            {[
              "Title", "Google map reviews", "reviewsCount", "street", "city", "state", "website",
              "phone Primaryurl", "phone secondary", "email primary", "email secondary", "categories",
              "business_facebook", "business_Instagram", "business_Twitter", "business_Youtube", "business_LinkedIn",
              "Dentist", "Staff_name1", "Staff_role1", "Staff_facebook1", "Staff_linkedin1",
            ].map((h) => <div key={h}>{h}</div>)}
          </div>
        </CardContent>
      </Card>

      <OutreachTypesCard />
    </div>
  );
}

function OutreachTypesCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["outreach-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_outreach_types").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user) return;
    const { error } = await supabase.from("user_outreach_types").insert({ name: trimmed, user_id: user.id });
    if (error) toast.error(error.message);
    else {
      toast.success("Outreach type added");
      setName("");
      qc.invalidateQueries({ queryKey: ["outreach-types"] });
    }
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("user_outreach_types").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Outreach type removed");
      qc.invalidateQueries({ queryKey: ["outreach-types"] });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outreach Types</CardTitle>
        <CardDescription>Built-in options include Email, Call, LinkedIn, Facebook, Instagram, and WhatsApp. Add extra methods here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Cold calling" />
          <Button onClick={add} disabled={!name.trim()}><Plus className="mr-2 h-4 w-4" /> Add</Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom outreach types yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.map((type) => (
              <li key={type.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{type.name}</span>
                <Button size="icon" variant="ghost" onClick={() => del(type.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
