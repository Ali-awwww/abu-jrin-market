import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { intlPhone, phoneToEmail } from "@/lib/market";
import { fieldCls } from "@/lib/ui";
import UpdateSection from "@/components/UpdateSection";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي — سوق قرية أبو جرين" },
      { name: "description", content: "سجّل أو ادخل برقم هاتفك في سوق قرية أبو جرين." },
      { property: "og:title", content: "حسابي في سوق أبو جرين" },
      { property: "og:description", content: "التسجيل برقم الهاتف." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Account,
});


function Account() {
  const { user, loading, isAdmin } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="p-6 text-center text-xl">جارِ التحميل...</p>;

  if (user) {
    const meta = user.user_metadata as { full_name?: string; phone?: string };
    return (
      <main className="space-y-4 px-4 pt-6">
        <h1 className="text-2xl font-extrabold">حسابي</h1>
        <div className="rounded-2xl border border-border bg-card p-4 text-lg shadow-soft">
          <p>👤 {meta.full_name || "مستخدم"}</p>
          <p dir="ltr" className="text-right">📞 {meta.phone}</p>
        </div>
        <Button asChild size="xl" variant="secondary" className="w-full"><Link to="/my-shop">🏪 دكاني</Link></Button>
        {isAdmin && (
          <Button asChild size="xl" variant="accent" className="w-full"><Link to="/admin">✅ الموافقة على الدكاكين</Link></Button>
        )}
        <UpdateSection />
        <Button size="xl" variant="outline" className="w-full" onClick={() => supabase.auth.signOut()}>تسجيل الخروج</Button>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) return void toast.error("أدخل رقم هاتف صحيح");
    if (password.length < 6) return void toast.error("كلمة السر 6 أحرف على الأقل");
    setBusy(true);
    const email = phoneToEmail(phone);
    const res =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { phone: intlPhone(phone).replace(/^963/, "0"), full_name: name } } })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) {
      toast.error(mode === "signup" ? (/already registered/i.test(res.error.message || "") ? "هذا الرقم مسجل مسبقاً، جرّب تسجيل الدخول" : "تعذّر إنشاء الحساب: " + (res.error.message || "")) : (/email not confirmed/i.test(res.error.message || "") ? "الحساب غير مؤكّد بعد" : "الرقم أو كلمة السر غير صحيحة"));
      return;
    }
    toast.success(mode === "signup" ? "تم التسجيل بنجاح" : "أهلاً بك");
  }

  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-extrabold">{mode === "login" ? "الدخول برقم الهاتف" : "تسجيل جديد"}</h1>
      <p className="text-lg text-muted-foreground">البحث عن المنتجات لا يحتاج تسجيل. التسجيل لأصحاب الدكاكين ولحفظ حسابك.</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input className={fieldCls} placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className={fieldCls} placeholder="رقم الهاتف مثل 0944123456" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input className={fieldCls} placeholder="كلمة السر" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button size="xl" className="w-full" disabled={busy}>{mode === "login" ? "دخول" : "تسجيل"}</Button>
      </form>
      <button className="w-full py-3 text-lg font-bold text-primary" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب؟ ادخل"}
      </button>
      <UpdateSection />
    </main>
  );
}
