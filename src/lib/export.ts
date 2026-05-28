import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export async function exportAll() {
  const [clinicsRes, staffRes, socialsRes, outreachRes] = await Promise.all([
    supabase.from("clinics").select("*").order("clinic_name"),
    supabase.from("staff").select("*"),
    supabase.from("socials").select("*"),
    supabase.from("outreach_timeline").select("*").order("date_logged", { ascending: false }),
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clinicsRes.data ?? []), "Clinics");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRes.data ?? []), "Staff");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(socialsRes.data ?? []), "Socials");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outreachRes.data ?? []), "Outreach");
  XLSX.writeFile(wb, `dental-crm-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportClinic(clinicId: string) {
  const [clinic, staff, socials, outreach] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", clinicId).maybeSingle(),
    supabase.from("staff").select("*").eq("clinic_id", clinicId),
    supabase.from("socials").select("*").eq("clinic_id", clinicId),
    supabase.from("outreach_timeline").select("*").eq("clinic_id", clinicId).order("date_logged", { ascending: false }),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clinic.data ? [clinic.data] : []), "Clinic");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staff.data ?? []), "Staff");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(socials.data ?? []), "Socials");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outreach.data ?? []), "Outreach");
  const name = clinic.data?.clinic_name?.replace(/[^a-z0-9]+/gi, "_") || "clinic";
  XLSX.writeFile(wb, `${name}-history.xlsx`);
}
