import { useEffect, useState } from "react";
import { VILLAGE_CENTER } from "@/lib/market";

/** Buyer position if allowed, otherwise the village centre. */
export function useBuyerLocation() {
  const [pos, setPos] = useState<[number, number]>(VILLAGE_CENTER);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { timeout: 8000 },
    );
  }, []);
  return pos;
}
