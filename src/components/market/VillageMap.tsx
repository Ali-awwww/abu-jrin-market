import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { VILLAGE_BOUNDS, VILLAGE_CENTER, type Shop, isShopOpen, directionsLink } from "@/lib/market";

type Props = {
  shops?: Shop[];
  height?: number | string;
  picked?: [number, number] | null;
  onPick?: (p: [number, number]) => void;
};

/*
 * نمط ماين كرافت للعرض فقط — على بيانات الخريطة الحقيقية نفسها:
 * - طبقة الأساس هي بلاطات OpenStreetMap نفسها
 *   (https://tile.openstreetmap.org)، أي الطرق والمباني والمواقع
 *   الحقيقية كما هي في بيانات OpenStreetMap، دون اختراع أي طريق
 *   أو مبنى أو دكان، ودون تغيير أي إحداثي أو بيانات.
 * - ما تغيّر هو أسلوب العرض فقط: البلاطات تُعرض مكسّرة البكسلات
 *   (image-rendering: pixelated) وبألوان مشبعة زاهية كما في ماين كرافت،
 *   وفوقها شبكة مكعبات خفيفة، والدبابيس والحدود والشارة مربعة
 *   بزوايا قائمة وظلال مكعبة، كما في اللعبة.
 * - ملاحظة: طبقة CARTO Positron السابقة أُزيلت لأن بلاطاتها صارت
 *   تطلب مفتاح API وتظهر «API KEY REQUIRED» بدل الخريطة، فعادت
 *   الخريطة إلى بلاطات OpenStreetMap التي تعمل دون مفتاح.
 * - لم يتغيّر شيء آخر: Leaflet نفسه، ومركز القرية وحدودها
 *   (VILLAGE_CENTER / VILLAGE_BOUNDS)، ودبابيس الدكاكين وبياناتها
 *   وأسعارها ومخزونها، وروابط الاتجاهات — كلها كما كانت.
 */
const MINECRAFT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const MINECRAFT_ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";

function pin(label: string, open: boolean) {
  // مكعب ماين كرافت: أخضر عشب للدكان المفتوح، ورمادي حجر للمغلق.
  const bg = open ? "#5cb531" : "#757575";
  const dot = open ? "#c6ff7a" : "#d6d3d1";
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center"><div style="display:flex;align-items:center;gap:6px;background:${bg};color:#fff;padding:6px 10px;border:3px solid #1b1b1b;border-radius:0;font-family:monospace;font-weight:900;font-size:13px;white-space:nowrap;text-shadow:1px 1px 0 rgba(0,0,0,.45);box-shadow:4px 4px 0 rgba(0,0,0,.45)"><span style="width:10px;height:10px;background:${dot};border:2px solid #1b1b1b"></span>🏪 ${label}</div><div style="width:12px;height:12px;background:${bg};border:3px solid #1b1b1b;border-top:none;box-shadow:4px 4px 0 rgba(0,0,0,.45)"></div></div>`,
    iconSize: [0, 0],
  });
}
const pickIcon = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%);display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:#e53935;border:3px solid #1b1b1b;border-radius:0;box-shadow:4px 4px 0 rgba(0,0,0,.45);font-size:22px">📍</div>`,
  iconSize: [0, 0],
});

export default function VillageMap({ shops = [], height = 260, picked, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!el.current) return;
    const bounds = L.latLngBounds(VILLAGE_BOUNDS);
    const m = L.map(el.current, {
      center: VILLAGE_CENTER,
      zoom: 16,
      minZoom: 15,
      maxZoom: 19,
      maxBounds: bounds,
      maxBoundsViscosity: 1,
      zoomControl: true,
    });
    // بيانات OpenStreetMap الحقيقية — عرض ماين كرافت فقط.
    L.tileLayer(MINECRAFT_TILE_URL, {
      attribution: MINECRAFT_ATTRIBUTION,
      maxZoom: 19,
      bounds,
    }).on("load", () => setLoading(false)).addTo(m);
    // بكسلات ماين كرافت: حواف حادة وألوان مشبعة زاهية على البلاطات نفسها.
    const tilePane = m.getPane("tilePane");
    if (tilePane) {
      tilePane.style.imageRendering = "pixelated";
      tilePane.style.filter = "saturate(1.9) contrast(1.12) brightness(1.04)";
    }
    // مقياس مسافة بأسلوب خرائط المدن، ليسهل تقدير المسافات بين الدكاكين.
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(m);
    // حدود القرية فقط — مكعبات خضراء زاهية متقطعة، دون تغيير الحدود نفسها (VILLAGE_BOUNDS).
    L.rectangle(bounds, {
      color: "#2e7d32",
      weight: 4,
      dashArray: "16 8",
      fillColor: "#76ff03",
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(m);
    m.on("click", (e) => pickRef.current?.([e.latlng.lat, e.latlng.lng]));
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    for (const s of shops) {
      if (s.lat == null || s.lng == null) continue;
      const open = isShopOpen(s);
      L.marker([s.lat, s.lng], { icon: pin(s.name, open) })
        .bindPopup(
          `<div dir="rtl" style="text-align:right;font-size:14px;line-height:1.7"><b style="font-size:15px">${s.name}</b><br/>${s.address}<br/><span style="color:${open ? "#15803d" : "#78716c"};font-weight:700">${open ? "مفتوح الآن" : "مغلق الآن"}</span><br/><a href="${directionsLink(s)}" target="_blank" rel="noopener">الاتجاهات في خرائط جوجل</a></div>`,
        )
        .addTo(g);
    }
    if (picked) L.marker(picked, { icon: pickIcon }).addTo(g);
  }, [shops, picked]);

  return (
    <div className="minecraft-map relative w-full" style={{ height }}>
      <style>{`.minecraft-map .leaflet-tile { image-rendering: pixelated; } .minecraft-map .leaflet-container { background: #8fce5e; }`}</style>
      <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-none border-4 border-[#1b1b1b] bg-[#8fce5e]" />
      {/* شبكة مكعبات ماين كرافت فوق الخريطة الحقيقية: مربعات 32px ومربعات أكبر كل 128px */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[350]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.10) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.14) 2px, transparent 2px), linear-gradient(90deg, rgba(0,0,0,0.14) 2px, transparent 2px)",
          backgroundSize: "32px 32px, 32px 32px, 128px 128px, 128px 128px",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.35), inset 0 0 24px rgba(0,0,0,0.12)",
        }}
      />
      {/* شارة ماين كرافت فوق الخريطة */}
      <div className="pointer-events-none absolute right-3 top-3 z-[450] flex items-center gap-1.5 border-[3px] border-[#1b1b1b] bg-[#5cb531] px-3 py-1.5 font-mono text-sm font-black text-white shadow-[4px_4px_0_rgba(0,0,0,0.45)] [text-shadow:2px_2px_0_rgba(0,0,0,0.4)]">
        ⛏️ خريطة ماين كرافت · قرية أبو جرين
      </div>
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex animate-pulse items-center justify-center border-4 border-[#1b1b1b] bg-[#7cb342] font-mono text-lg font-black text-white [text-shadow:2px_2px_0_rgba(0,0,0,0.4)]">
          ⏳ جارِ تحميل خريطة ماين كرافت...
        </div>
      )}
      {/* مفتاح ألوان العرض فقط — لا يضيف أي طريق أو مبنى أو دكان */}
      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs font-bold text-slate-700">
        <span className="inline-flex items-center gap-1 border-2 border-[#1b1b1b] bg-white px-2 py-1 shadow-[3px_3px_0_rgba(0,0,0,0.35)]"><span className="inline-block h-3 w-3 border border-[#1b1b1b] bg-[#5cb531]" /> دكان مفتوح</span>
        <span className="inline-flex items-center gap-1 border-2 border-[#1b1b1b] bg-white px-2 py-1 shadow-[3px_3px_0_rgba(0,0,0,0.35)]"><span className="inline-block h-3 w-3 border border-[#1b1b1b] bg-[#757575]" /> دكان مغلق</span>
        <span className="inline-flex items-center gap-1 border-2 border-[#1b1b1b] bg-white px-2 py-1 shadow-[3px_3px_0_rgba(0,0,0,0.35)]"><span className="inline-block h-3 w-3 border-2 border-[#2e7d32]" /> حدود القرية فقط</span>
        <span>بيانات حقيقية من OpenStreetMap</span>
      </div>
    </div>
  );
}
