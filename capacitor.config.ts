import type { CapacitorConfig } from "@capacitor/cli";

// إعدادات غلاف أندرويد (Capacitor): نفس تطبيق الويب كما هو،
// تُبنى نسخة الويب أولاً (وضع SPA) ثم تُنسخ مخرجات العميل الثابتة (dist/client) إلى مشروع أندرويد الأصلي.
const config: CapacitorConfig = {
  appId: "com.abujrin.market",
  appName: "سوق أبو جرين",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
};

export default config;
