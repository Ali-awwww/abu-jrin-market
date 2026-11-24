import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";

const VillageMap = lazy(() => import("./VillageMap"));

export function MapBox(props: ComponentProps<typeof VillageMap>) {
  const fallback = (
    <div style={{ height: props.height ?? 260 }} className="w-full animate-pulse rounded-2xl bg-muted" />
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <VillageMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
