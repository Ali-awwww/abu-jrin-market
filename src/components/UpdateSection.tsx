import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  CURRENT_VERSION,
  fetchLatestRelease,
  firstNewsLine,
  isNewerVersion,
  normalizeVersion,
  openApkUrl,
  type UpdateInfo,
} from "@/lib/updateCheck";

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "update"; update: UpdateInfo }
  | { status: "error" };

/**
 * قسم "التحديثات" في شاشة الحساب: يعرض الإصدار الحالي
 * وزراً للتحقق اليدوي من وجود تحديث (يجلب دائماً).
 */
export default function UpdateSection() {
  const [state, setState] = useState<CheckState>({ status: "idle" });

  async function handleCheck() {
    setState({ status: "checking" });
    try {
      const latest = await fetchLatestRelease();
      if (!latest) {
        setState({ status: "error" });
        return;
      }
      const version = normalizeVersion(latest.tag);
      if (version.length > 0 && isNewerVersion(version, CURRENT_VERSION)) {
        setState({
          status: "update",
          update: {
            version,
            tag: latest.tag,
            apkUrl: latest.apkUrl,
            whatsNew: firstNewsLine(latest.body),
          },
        });
      } else {
        setState({ status: "up-to-date" });
      }
    } catch {
      setState({ status: "error" });
    }
  }

  const checking = state.status === "checking";

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
      <h2 className="text-base font-bold text-neutral-900">التحديثات</h2>
      <p className="mt-1 text-sm text-neutral-600">
        الإصدار الحالي: {CURRENT_VERSION}
      </p>

      {state.status === "up-to-date" ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          إصدارك هو الأحدث
        </p>
      ) : null}

      {state.status === "update" ? (
        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2">
          <p className="text-sm font-bold text-emerald-800">
            يوجد تحديث جديد {state.update.version}
          </p>
          {state.update.whatsNew ? (
            <p className="mt-0.5 text-xs text-emerald-700">
              {state.update.whatsNew}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => openApkUrl(state.update.apkUrl)}
            className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            تحديث
          </button>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          تعذّر التحقق من وجود تحديث. تحقق من اتصالك بالإنترنت وحاول مجدداً.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleCheck()}
        disabled={checking}
        className="mt-3 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <RefreshCw className={checking ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {checking ? "جارٍ التحقق…" : "التحقق من وجود تحديث"}
      </button>
    </section>
  );
}
