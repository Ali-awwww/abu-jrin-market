import { useEffect, useRef } from "react";
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
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center"><div style="background:${open ? "oklch(0.48 0.11 145)" : "oklch(0.5 0.03 60)"};color:#fff;padding:4px 10px;border-radius:12px;font-weight:700;font-size:13px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3)">🏪 ${label}</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${open ? "oklch(0.48 0.11 145)" : "oklch(0.5 0.03 60)"}"></div></div>`,
    iconSize: [0, 0],
  });
}
const pickIcon = L.divIcon({ className: "", html: `<div style="transform:translate(-50%,-100%);font-size:34px">📍</div>`, iconSize: [0, 0] });

export default function VillageMap({ shops = [], height = 260, picked, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

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
          `<div dir="rtl" style="text-align:right"><b>${s.name}</b><br/>${s.address}<br/>${open ? "مفتوح الآن" : "مغلق الآن"}<br/><a href="${directionsLink(s)}" target="_blank" rel="noopener">الاتجاهات في خرائط جوجل</a></div>`,
        )
        .addTo(g);
    }
    if (picked) L.marker(picked, { icon: pickIcon }).addTo(g);
  }, [shops, picked]);

  return <div ref={el} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-border" />;
}
