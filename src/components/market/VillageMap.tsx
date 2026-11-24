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

function pin(label: string, open: boolean) {
  const bg = open ? "oklch(0.5 0.13 145)" : "oklch(0.52 0.02 60)";
  const dot = open ? "#4ade80" : "#d6d3d1";
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center"><div style="display:flex;align-items:center;gap:6px;background:${bg};color:#fff;padding:6px 12px;border-radius:999px;border:2px solid #fff;font-weight:800;font-size:13px;white-space:nowrap;box-shadow:0 0 0 1px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.35)"><span style="width:8px;height:8px;border-radius:50%;background:${dot};box-shadow:0 0 0 2px rgba(255,255,255,.35)"></span>🏪 ${label}</div><div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid ${bg};filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))"></div></div>`,
    iconSize: [0, 0],
  });
}
const pickIcon = L.divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%);display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:#fff;border:3px solid #ef4444;box-shadow:0 4px 12px rgba(0,0,0,.4);font-size:22px">📍</div>`,
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
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
      bounds,
    }).on("load", () => setLoading(false)).addTo(m);
    // طبقة تجميل فوق الخريطة: إطار مزخرف يحدد حدود القرية دون تغيير بياناتها
    L.rectangle(bounds, {
      color: "#d97706",
      weight: 3,
      dashArray: "12 8",
      fillColor: "#f59e0b",
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
    <div className="relative w-full" style={{ height }}>
      <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-border" />
      {/* طبقة تجميل فوق الخريطة: تدرج ضوئي وتظليل خفيف وإطار داخلي نظيف */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[350] rounded-2xl"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(255,255,255,0) 28%), radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.12) 100%)",
          boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.55), inset 0 0 28px rgba(0,0,0,0.10)",
        }}
      />
      {/* شارة اسم القرية فوق الخريطة */}
      <div className="pointer-events-none absolute right-3 top-3 z-[450] flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-sm font-extrabold text-stone-800 shadow-lg backdrop-blur">
        🗺️ قرية أبو جرين · قرب السفيرة، حلب
      </div>
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex animate-pulse items-center justify-center rounded-2xl bg-muted text-lg font-bold text-muted-foreground">
          جارِ تحميل الخريطة...
        </div>
      )}
    </div>
  );
}
