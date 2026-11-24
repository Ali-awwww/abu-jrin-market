import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, ImagePlus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapBox } from "@/components/market/MapBox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, UNITS, categoryByName, formatSyp, formatUsd, withPhotoUrls, type Product, type Shop } from "@/lib/market";
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
  if (loading || shop.isPending) return <p className="p-4 text-center text-lg">جارٍ التحميل...</p>;
  if (!user) return <NoAuth />;
  if (!shop.data) return <CreateShop userId={user.id} phone={user.phone ?? ""} />;
  return <Dashboard shop={shop.data} />;
}
function NoAuth() {
  return (
    <main className="space-y-4 px-4 pt-4 text-center">
      <h1 className="text-2xl font-extrabold">دكاني</h1>
      <p className="text-lg text-muted-foreground">سجّل دخولك أولاً لتسجيل دكانك وإضافة منتجاتك.</p>
      <Link to="/account" className="block rounded-2xl bg-primary py-3 text-lg font-bold text-primary-foreground">
        تسجيل الدخول / إنشاء حساب
      </Link>
    </main>
  );
}

type ShopDraft = {
  name: string;
  owner_name: string;
  phone: string;
  address: string;
  lat: string;
  lng: string;
  open_time: string;
  close_time: string;
};
function CreateShop({ userId, phone }: { userId: string; phone: string }) {
  const qc = useQueryClient();
  const [d, setD] = useState<ShopDraft>({
    name: "",
    owner_name: "",
    phone,
    address: "أبو جرين",
    lat: "36.0475",
    lng: "37.4508",
    open_time: "08:00",
    close_time: "20:00",
  });
  const [saving, setSaving] = useState(false);
  const set =
    (k: keyof ShopDraft) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setD((s) => ({ ...s, [k]: e.target.value }));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("shops").insert({
        owner_id: userId,
        name: d.name.trim(),
        owner_name: d.owner_name.trim(),
        phone: d.phone.trim(),
        address: d.address.trim(),
        lat: Number(d.lat),
        lng: Number(d.lng),
        open_time: d.open_time,
        close_time: d.close_time,
        status: "pending",
      });
      if (error) throw error;
      toast.success("تم إرسال طلب تسجيل دكانك، وسيتم نشره بعد موافقة الإدارة");
      qc.invalidateQueries({ queryKey: ["my-shop"] });
    } catch {
      toast.error("تعذر إرسال الطلب");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="space-y-4 px-4 pt-4">
      <h1 className="text-2xl font-extrabold">تسجيل دكان جديد</h1>
      <form onSubmit={save} className="space-y-3">
        <label className="block text-lg font-bold">
          اسم الدكان
          <input className={fieldCls} value={d.name} onChange={set("name")} required />
        </label>
        <label className="block text-lg font-bold">
          اسم صاحب الدكان
          <input className={fieldCls} value={d.owner_name} onChange={set("owner_name")} required />
        </label>
        <label className="block text-lg font-bold">
          رقم واتساب
          <input className={fieldCls} type="tel" dir="ltr" placeholder="+9639xxxxxxxx" value={d.phone} onChange={set("phone")} required />
        </label>
        <label className="block text-lg font-bold">
          عنوان الدكان في القرية
          <input className={fieldCls} value={d.address} onChange={set("address")} required />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-lg font-bold">
            خط العرض
            <input className={fieldCls} inputMode="decimal" value={d.lat} onChange={set("lat")} required />
          </label>
          <label className="block text-lg font-bold">
            خط الطول
            <input className={fieldCls} inputMode="decimal" value={d.lng} onChange={set("lng")} required />
          </label>
        </div>
        <p className="text-base text-muted-foreground">
          افتح تطبيق الخرائط على جوالك في مكان الدكان وانسخ رقمَي خط العرض وخط الطول من موقعك. الإحداثيات الافتراضية هي وسط القرية.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-lg font-bold">
            يفتح الساعة
            <input className={fieldCls} type="time" value={d.open_time} onChange={set("open_time")} required />
          </label>
          <label className="block text-lg font-bold">
            يغلق الساعة
            <input className={fieldCls} type="time" value={d.close_time} onChange={set("close_time")} required />
          </label>
        </div>
        <button className="w-full rounded-2xl bg-primary py-3 text-xl font-bold text-primary-foreground disabled:opacity-50" disabled={saving}>
          {saving ? "جارٍ الإرسال..." : "إرسال الطلب"}
        </button>
      </form>
    </main>
  );
}

type Draft = {
  id: string | null;
  name: string;
  category: string;
  description: string;
  unit: string;
  price_syp: string;
  price_usd: string;
  stock: string;
  photo_url: string | null;
  visible: boolean;
};
const empty: Draft = {
  id: null,
  name: "",
  category: "خضار",
  description: "",
  unit: "كغ",
  price_syp: "",
  price_usd: "",
  stock: "10",
  photo_url: null,
  visible: true,
};

function Dashboard({ shop }: { shop: Shop }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState<Draft | null>(null);
  const q = useQuery({
    queryKey: ["my-products", shop.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("shop_id", shop.id).order("name");
      if (error) throw error;
      return withPhotoUrls(data as Product[]);
    },
  });
  const products = q.data ?? [];
  async function toggle(p: Product) {
    const { error } = await supabase.from("products").update({ visible: !p.visible }).eq("id", p.id);
    if (error) toast.error("تعذر التعديل");
    else qc.invalidateQueries({ queryKey: ["my-products"] });
  }
  return (
    <main className="space-y-4 px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{shop.name}</h1>
          <p className="text-base text-muted-foreground">
            {shop.status === "pending" ? "قيد المراجعة — منتجاتك لن تظهر حتى تتم الموافقة." : shop.status === "rejected" ? "تم رفض الدكان." : "دكان معتمد"}
          </p>
        </div>
        <Link to="/shop/$shopId" params={{ shopId: shop.id }} className="rounded-full border border-border bg-card px-4 py-2 text-base font-bold">
          عرض دكاني
        </Link>
      </div>
      <MapBox shops={[shop]} />
      <Button onClick={() => setOpen(empty)} className="h-14 w-full rounded-2xl text-xl font-bold">
        <Plus /> إضافة منتج
      </Button>
      {q.isPending ? (
        <p className="py-6 text-center text-lg text-muted-foreground">جارٍ التحميل...</p>
      ) : products.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-center text-lg text-muted-foreground shadow-soft">
          لا توجد منتجات بعد. أضف أول منتج ليظهر في السوق.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
              {p.photoSrc ? (
                <img src={p.photoSrc} alt={p.name} className="size-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">🧺</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">
                  {p.name} <span className="text-sm font-normal text-muted-foreground">· {p.category}</span>
                </p>
                {p.description ? <p className="truncate text-sm text-muted-foreground">{p.description}</p> : null}
                <p className="text-base">
                  {formatSyp(p.price_syp)} · {formatUsd(p.price_usd)} / {p.unit} · المخزون: {p.stock}
                </p>
              </div>
              <button
                aria-label={p.visible ? "إخفاء المنتج" : "إظهار المنتج"}
                onClick={() => toggle(p)}
                className="rounded-full border border-border p-2"
              >
                {p.visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              </button>
              <button
                aria-label="تعديل المنتج"
                onClick={() =>
                  setOpen({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    description: p.description ?? "",
                    unit: p.unit,
                    price_syp: String(p.price_syp),
                    price_usd: String(p.price_usd),
                    stock: String(p.stock),
                    photo_url: p.photo_url,
                    visible: p.visible,
                  })
                }
                className="rounded-full border border-border p-2"
              >
                <Pencil className="size-5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {open && <ProductForm draft={open} shopId={shop.id} onClose={() => setOpen(null)} />}
    </main>
  );
}

function ProductForm({ draft, shopId, onClose }: { draft: Draft; shopId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [d, setD] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const selectedCategory = categoryByName(d.category);
  const set =
    (k: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setD((s) => ({ ...s, [k]: e.target.value }));
  const setV = (v: boolean) => setD((s) => ({ ...s, visible: v }));
  function pickPhoto(f: File | undefined) {
    if (!f) return;
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(d.price_syp);
    const usd = Number(d.price_usd);
    if (!d.name.trim() || !(price >= 0) || !(usd >= 0) || !(Number(d.stock) >= 0)) return;
    setSaving(true);
    try {
      let photoPath = d.photo_url;
      if (photo) {
        setUploading(true);
        const path = `${shopId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("product-photos").upload(path, photo);
        if (error) throw error;
        photoPath = path;
        setUploading(false);
      }
      const row = {
        name: d.name.trim(),
        category: d.category,
        description: d.description.trim() || null,
        unit: d.unit,
        price_syp: price,
        price_usd: usd,
        stock: Number(d.stock),
        photo_url: photoPath,
        visible: d.visible,
        updated_at: new Date().toISOString(),
      };
      const persist = (withDescription: boolean) =>
        d.id
          ? supabase.from("products").update(withDescription ? row : { ...row, description: undefined }).eq("id", d.id)
          : supabase.from("products").insert(withDescription ? { ...row, shop_id: shopId } : { ...row, description: undefined, shop_id: shopId });
      let { error } = await persist(true);
      let descriptionSaved = !error;
      if (error && /description/i.test(error.message)) {
        // عمود الوصف غير مضاف بعد في قاعدة البيانات الحية؛ احفظ المنتج بدونه.
        ({ error } = await persist(false));
        descriptionSaved = false;
      }
      if (error) throw error;
      toast.success(descriptionSaved ? "تم الحفظ" : "تم الحفظ، لكن وصف المنتج يحتاج إضافة عمود description في قاعدة البيانات");
      onClose();
      qc.invalidateQueries({ queryKey: ["my-products"] });
    } catch {
      toast.error("تعذر الحفظ");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={save} className="mx-auto max-w-md space-y-3 rounded-3xl bg-card p-4">
        <h2 className="text-2xl font-extrabold">{d.id ? "تعديل منتج" : "إضافة منتج"}</h2>
        <label className="block text-lg font-bold">
          اسم المنتج
          <input className={fieldCls} value={d.name} onChange={set("name")} required />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-lg font-bold">
            التصنيف
            <select className={fieldCls} value={d.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-lg font-bold">
            الوحدة
            <select className={fieldCls} value={d.unit} onChange={set("unit")}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedCategory && (
          <p className="text-base text-muted-foreground">
            {selectedCategory.icon} {selectedCategory.name}: {selectedCategory.description}
          </p>
        )}
        {d.category === "أخرى" && (
          <label className="block text-lg font-bold">
            وصف المنتج (يكتبه البائع)
            <textarea
              className="mt-1 min-h-28 w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-xl outline-none focus:border-primary"
              rows={3}
              placeholder="اكتب وصفاً قصيراً للمنتج، مثل نوعه وحجمه واستخدامه"
              value={d.description}
              onChange={set("description")}
              required
            />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-lg font-bold">
            السعر (ل.س)
            <input className={fieldCls} inputMode="decimal" value={d.price_syp} onChange={set("price_syp")} required />
          </label>
          <label className="block text-lg font-bold">
            السعر ($)
            <input className={fieldCls} inputMode="decimal" value={d.price_usd} onChange={set("price_usd")} required />
          </label>
        </div>
        <label className="block text-lg font-bold">
          الكمية المتوفرة
          <input className={fieldCls} inputMode="numeric" value={d.stock} onChange={set("stock")} required />
        </label>
        <label className="block text-lg font-bold">
          صورة المنتج (اختياري)
          <span className="mt-1 flex items-center gap-2 rounded-xl border-2 border-dashed border-input px-4 py-3 text-base font-normal">
            <ImagePlus className="size-6 shrink-0" />
            {photo ? photo.name : d.photo_url ? "صورة محفوظة" : "اختر صورة من جوالك"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
          </span>
        </label>
        {photoPreview && <img src={photoPreview} alt="معاينة الصورة" className="max-h-48 w-full rounded-xl object-cover" />}
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <span className="text-lg font-bold">ظاهر في السوق</span>
          <button type="button" aria-label="تبديل الظهور" onClick={() => setV(!d.visible)} className="rounded-full border border-border p-2">
            {d.visible ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-border py-3 text-xl font-bold">
            إلغاء
          </button>
          <button className="flex-1 rounded-2xl bg-primary py-3 text-xl font-bold text-primary-foreground disabled:opacity-50" disabled={saving || uploading}>
            {uploading ? "جارٍ رفع الصورة..." : saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Camera className="mr-1 inline size-4" /> صورة واضحة للمنتج تساعد الزبائن على الشراء
        </p>
      </form>
    </div>
  );
}
