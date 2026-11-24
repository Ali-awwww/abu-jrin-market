import { lazy, Suspense, type ComponentProps } from "react";
import { ClientOnly } from "@tanstack/react-router";

const VillageMap = lazy(() => import("./VillageMap"));

export function MapBox(props: ComponentProps<typeof VillageMap>) {
  const fallback = (
    <div style={{ height: props.height ?? 260 }} className="flex w-full animate-pulse items-center justify-center rounded-2xl bg-muted text-lg font-bold text-muted-foreground">جارِ تحميل الخريطة...</div>
  );
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <VillageMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
