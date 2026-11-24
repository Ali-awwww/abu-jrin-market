import type { CapacitorConfig } from "@capacitor/cli";

// إعدادات غلاف أندرويد (Capacitor): نفس تطبيق الويب كما هو،
// تُبنى نسخة الويب أولاً (وضع SPA، المجلد dist) ثم تُنسخ إلى مشروع أندرويد الأصلي.
const config: CapacitorConfig = {
  appId: "com.abujrin.market",
  appName: "سوق أبو جرين",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
