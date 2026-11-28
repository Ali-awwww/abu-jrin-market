import { useEffect, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import {
  checkForUpdate,
  dismissForToday,
  isDismissedToday,
  markAutoChecked,
  openApkUrl,
  shouldAutoCheck,
  type UpdateInfo,
} from "@/lib/updateCheck";

/**
 * بطاقة التحديث عند فتح التطبيق.
 * تظهر فقط عند وجود إصدار أحدث ولم يضغط المستخدم
 * "لا تذكرني اليوم" اليوم.
 * بطاقة صغيرة ثابتة فوق شريط التنقل السفلي،
 * لا تغطي شريط البحث ولا أزرار الصفحة.
 */
export default function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        // الفحص التلقائي مرة واحدة في اليوم كحد أقصى.
        if (!shouldAutoCheck()) return;
        markAutoChecked();
        const found = await checkForUpdate();
        if (cancelled || !found) return;
        if (isDismissedToday(found.version)) return;
        setUpdate(found);
      } catch {
        // فشل الفحص لا يوقف التطبيق أبداً.
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-3 shadow-soft"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-primary">
          <ArrowDownToLine className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900">
            يوجد تحديث جديد {update.version}
          </p>
          {update.whatsNew ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
              {update.whatsNew}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => openApkUrl(update.apkUrl)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          تحديث
        </button>
        <button
          type="button"
          onClick={() => {
            dismissForToday(update.version);
            setUpdate(null);
          }}
          className="rounded-xl px-3 py-2 text-xs font-medium text-neutral-500"
        >
          لا تذكرني اليوم
        </button>
      </div>
    </div>
  );
}
