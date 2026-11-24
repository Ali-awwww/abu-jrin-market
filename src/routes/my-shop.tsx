import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, ImagePlus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapBox } from "@/components/market/MapBox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, UNITS, formatSyp, formatUsd, withPhotoUrls, type Product, type Shop } from "@/lib/market";
import { fieldCls } from "@/lib/ui";

export const Route = createFileRoute("/my-shop")({
  head: () => ({
    meta: [
      { title: "دكاني — سوق قرية أبو جرين" },
      { name: "description", content: "سجّل دكانك في سوق أبو جرين وأضف منتجاتك وأسعارك بسهولة." },
      { property: "og:title", content: "دكاني في سوق أبو جرين" },
      { property: "og:description", content: "أضف منتجات دكانك وأسعارها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyShop,
});

function MyShop() {
  const { user, loading } = useAuth();
  const shop = useQuery({
    queryKey: ["my-shop", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("*").eq("owner_id", user!.id).maybeSingle();
      return (data as Shop | null) ?? null;
    },
  });
  if (loading || (user && shop.isLoading)) return <p className="p-6 text-center text-xl">جارِ التحميل...</p>;
  if (!user)
    return (
      <main className="space-y-4 px-4 pt-10 text-center">
        <p className="text-5xl">🏪</p>
        <h1 className="text-2xl font-extrabold">هل عندك دكان في القرية؟</h1>
        <p className="text-lg text-muted-foreground">سجّل برقم هاتفك ثم أضف دكانك ومنتجاتك.</p>
        <Button asChild size="xl" className="w-full"><Link to="/account">الدخول / التسجيل</Link></Button>
      </main>
    );
  if (!shop.data) return <RegisterShop userId={user.id} />;
  if (shop.data.status === "pending")
    return (
      <main className="space-y-3 px-4 pt-10 text-center">
        <p className="text-5xl">⏳</p>
        <h1 className="text-2xl font-extrabold">{shop.data.name}</h1>
        <p className="text-xl">دكانك بانتظار موافقة المشرف (علي). بعد الموافقة يظهر للناس وتقدر تضيف منتجاتك.</p>
      </main>
    );
  return <Dashboard shop={shop.data} userId={user.id} />;
}

function RegisterShop({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", owner_name: "", phone: "", address: "", open_time: "08:00", close_time: "21:00" });
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin && !f.address.trim()) return void toast.error("حدد الموقع على الخريطة أو اكتب العنوان");
    setBusy(true);
    const { error } = await supabase.from("shops").insert({
      ...f, phone: f.phone.replace(/\D/g, ""), owner_id: userId, lat: pin?.[0] ?? null, lng: pin?.[1] ?? null,
    });
    setBusy(false);
    if (error) return void toast.error("تعذر تسجيل الدكان");
    toast.success("تم إرسال الدكان للموافقة");
    qc.invalidateQueries({ queryKey: ["my-shop"] });
  }

  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-extrabold">تسجيل دكان جديد</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className={fieldCls} placeholder="اسم الدكان" value={f.name} onChange={set("name")} required />
        <input className={fieldCls} placeholder="اسم صاحب الدكان" value={f.owner_name} onChange={set("owner_name")} required />
        <input className={fieldCls} placeholder="رقم الهاتف / واتساب" inputMode="tel" dir="ltr" value={f.phone} onChange={set("phone")} required />
        <input className={fieldCls} placeholder="العنوان، مثل: الشارع الرئيسي قرب الجامع" value={f.address} onChange={set("address")} />
        <p className="text-lg font-bold">أو اضغط على الخريطة لتحديد مكان الدكان:</p>
        <MapBox height={240} picked={pin} onPick={setPin} />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-lg font-bold">يفتح<input type="time" className={fieldCls} value={f.open_time} onChange={set("open_time")} /></label>
          <label className="text-lg font-bold">يغلق<input type="time" className={fieldCls} value={f.close_time} onChange={set("close_time")} /></label>
        </div>
        <Button size="xl" className="w-full" disabled={busy}>إرسال للموافقة</Button>
      </form>
    </main>
  );
}

type Draft = { id?: string; name: string; category: string; unit: string; price_syp: string; price_usd: string; stock: string; photo_url: string | null };
const empty: Draft = { name: "", category: "خضار", unit: "كغ", price_syp: "", price_usd: "", stock: "", photo_url: null };

function Dashboard({ shop, userId }: { shop: Shop; userId: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const products = useQuery({
    queryKey: ["my-products", shop.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("name");
      if (error) throw error;
      return withPhotoUrls(data as Product[]);
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-products"] });
    qc.invalidateQueries({ queryKey: ["offers"] });
  };
  async function toggle(p: Product) {
    await supabase.from("products").update({ visible: !p.visible }).eq("id", p.id);
    refresh();
  }

  return (
    <main className="space-y-4 px-4 pt-6">
      <h1 className="text-2xl font-extrabold">🏪 {shop.name}</h1>
      {!draft && (
        <Button size="xl" className="w-full" onClick={() => setDraft(empty)}><Plus /> إضافة منتج</Button>
      )}
      {draft && <ProductForm draft={draft} shopId={shop.id} userId={userId} onDone={() => { setDraft(null); refresh(); }} />}
      <ul className="space-y-2">
        {products.data?.map((p) => (
          <li key={p.id} className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft ${p.visible ? "" : "opacity-60"}`}>
            {p.photoSrc ? <img src={p.photoSrc} alt="" className="size-16 rounded-xl object-cover" /> : <div className="flex size-16 items-center justify-center rounded-xl bg-secondary text-2xl">🧺</div>}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{p.name} {!p.visible && <span className="text-sm">(مخفي)</span>}</p>
              <p className="text-base">{formatSyp(p.price_syp)} · {formatUsd(p.price_usd)} / {p.unit}</p>
              <p className="text-sm text-muted-foreground">الكمية: {p.stock}</p>
            </div>
            <Button variant="outline" size="icon" className="size-12" aria-label="تعديل"
              onClick={() => setDraft({ id: p.id, name: p.name, category: p.category, unit: p.unit, price_syp: String(p.price_syp), price_usd: String(p.price_usd), stock: String(p.stock), photo_url: p.photo_url })}>
              <Pencil />
            </Button>
            <Button variant="outline" size="icon" className="size-12" aria-label={p.visible ? "إخفاء" : "إظهار"} onClick={() => toggle(p)}>
              {p.visible ? <Eye /> : <EyeOff />}
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function ProductForm({ draft, shopId, userId, onDone }: { draft: Draft; shopId: string; userId: string; onDone: () => void }) {
  const [d, setD] = useState(draft);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let photo_url = d.photo_url;
    if (file) {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.]/g, "")}`;
      const up = await supabase.storage.from("product-photos").upload(path, file, { contentType: file.type });
      if (up.error) { setBusy(false); return void toast.error("تعذر رفع الصورة"); }
      photo_url = path;
    }
    const row = {
      name: d.name.trim(), category: d.category, unit: d.unit,
      price_syp: Number(d.price_syp) || 0, price_usd: Number(d.price_usd) || 0, stock: Number(d.stock) || 0,
      photo_url, updated_at: new Date().toISOString(),
    };
    const res = d.id
      ? await supabase.from("products").update(row).eq("id", d.id)
      : await supabase.from("products").insert({ ...row, shop_id: shopId });
    setBusy(false);
    if (res.error) return void toast.error("تعذر الحفظ");
    toast.success("تم الحفظ");
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border-2 border-primary bg-card p-4">
      <h2 className="text-xl font-bold">{d.id ? "تعديل المنتج" : "منتج جديد"}</h2>
      <input className={fieldCls} placeholder="اسم المنتج، مثل بطاطا" value={d.name} onChange={set("name")} required />
      <div className="grid grid-cols-2 gap-2">
        <select className={fieldCls} value={d.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <select className={fieldCls} value={d.unit} onChange={set("unit")}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-lg font-bold">السعر بالليرة<input className={fieldCls} inputMode="decimal" value={d.price_syp} onChange={set("price_syp")} required /></label>
        <label className="text-lg font-bold">السعر بالدولار<input className={fieldCls} inputMode="decimal" value={d.price_usd} onChange={set("price_usd")} required /></label>
      </div>
      <label className="block text-lg font-bold">الكمية المتوفرة<input className={fieldCls} inputMode="decimal" value={d.stock} onChange={set("stock")} required /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input text-lg font-bold">
          <Camera className="size-5" /> الكاميرا
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input text-lg font-bold">
          <ImagePlus className="size-5" /> المعرض
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {file && <p className="text-base text-muted-foreground">📷 {file.name}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button size="xl" disabled={busy}>حفظ</Button>
        <Button size="xl" type="button" variant="outline" onClick={onDone}>إلغاء</Button>
      </div>
    </form>
  );
}
