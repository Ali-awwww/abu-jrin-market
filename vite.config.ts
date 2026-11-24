// إعداد Vite بالمكوّنات الأصلية (بدون غلاف Lovable الخاص، الذي لا توجد نسخه
// المطلوبة على npm العام، فتعذّر تثبيت الاعتماديات في GitHub Actions).
// - tanstackStart بوضع SPA ليُبنى التطبيق كملفات ثابتة (GitHub Pages + Capacitor).
// - viteReact و tailwindcss (Tailwind v4) و tsConfigPaths للاسم المستعار @.
// منطق التطبيق نفسه لم يتغيّر؛ هذا إعداد البناء فقط.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  // مدخلا بيئتَي العميل والخادم صراحةً لـ Rollup: إصدار
  // @tanstack/start-plugin-core المثبّت (1.172.0) يضبط مدخل العميل
  // في rolldownOptions فقط، فيتجاهله Vite العادي ويعود إلى
  // index.html غير الموجود، ومدخل SSR من دون ضبط صريح يعود
  // إلى index.html أيضاً وهو غير مسموح في بناء SSR.
  // src/client.tsx و src/server.ts هما دخولا الإطار القياسيان.
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: { index: "src/client.tsx" },
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: { index: "src/server.ts" },
        },
      },
    },
  },
});
