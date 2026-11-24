import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Shop } from "@/lib/market";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "الموافقة على الدكاكين — سوق أبو جرين" },
      { name: "description", content: "صفحة المشرف للموافقة على الدكاكين الجديدة." },
      { property: "og:title", content: "إدارة سوق أبو جرين" },
      { property: "og:description", content: "الموافقة على الدكاكين الجديدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const pending = useQuery({
    queryKey: ["pending-shops"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*").eq("status", "pending").order("created_at");
      if (error) throw error;
      return data as Shop[];
    },
  });
  if (loading) return null;
  if (!user || !isAdmin)
    return (
      <main className="p-6 text-center text-xl">
        هذه الصفحة للمشرف فقط. <Link to="/account" className="font-bold text-primary">الدخول</Link>
      </main>
    );

  async function approve(id: string) {
    const { error } = await supabase.from("shops").update({ status: "approved" }).eq("id", id);
    if (error) return void toast.error("تعذرت الموافقة");
    toast.success("تمت الموافقة على الدكان");
    qc.invalidateQueries({ queryKey: ["pending-shops"] });
    qc.invalidateQueries({ queryKey: ["shops"] });
  }

  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-extrabold">✅ دكاكين بانتظار الموافقة</h1>
      {pending.data?.length === 0 && <p className="text-xl text-muted-foreground">لا يوجد دكاكين جديدة.</p>}
      {pending.data?.map((s) => (
        <div key={s.id} className="space-y-1 rounded-2xl border border-border bg-card p-4 text-lg shadow-soft">
          <p className="text-xl font-bold">🏪 {s.name}</p>
          <p>👤 {s.owner_name}</p>
          <p dir="ltr" className="text-right">📞 {s.phone}</p>
          <p>📍 {s.address || "—"} {s.lat != null && "(محدد على الخريطة)"}</p>
          <Button size="xl" className="mt-2 w-full" onClick={() => approve(s.id)}>موافقة</Button>
        </div>
      ))}
    </main>
  );
}
