// فحص التحديث داخل التطبيق.
//
// يجلب آخر إصدار منشور من:
// https://apps-showcase.pages.dev/api/latest
// ويقارنه بالإصدار الحالي رقمياً جزءاً بجزء.
// أي فشل في الفحص (لا إنترنت، انتهاء المهلة، رد سيئ) يفشل بصمت
// ويرجع null ولا يوقف التطبيق أبداً.

/**
 * الإصدار الحالي للتطبيق — يجب رفعه مع كل إصدار جديد
 * (في package.json وفي سير عمل بناء الأندرويد).
 */
export const CURRENT_VERSION = "1.5.2";

/** اسم المستودع كما يظهر في واجهة آخر الإصدارات. */
export const REPO_NAME = "abu-jrin-market";

const LATEST_URL = "https://apps-showcase.pages.dev/api/latest";

/** مهلة طلب الفحص: 30 ثانية. */
const CHECK_TIMEOUT_MS = 30000;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const LAST_CHECK_KEY = "abu-jrin-market:last-update-check";
const DISMISSED_KEY = "abu-jrin-market:update-dismissed";

export interface LatestRelease {
  repo: string;
  tag: string;
  apkUrl: string;
  body: string;
}

export interface UpdateInfo {
  /** الإصدار الجديد بدون حرف v في البداية، مثل "1.5.1". */
  version: string;
  tag: string;
  apkUrl: string;
  /** سطر واحد قصير من الجديد في هذا الإصدار. */
  whatsNew: string;
}

/** يزيل حرف v من بداية الإصدار والمسافات الزائدة. */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^[vV]/, "").split("+")[0]?.trim() ?? "";
}

function parseVersionParts(version: string): number[] {
  return normalizeVersion(version)
    .split(".")
    .map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isNaN(n) ? 0 : n;
    });
}

/**
 * مقارنة رقمية جزءاً بجزء: 1.5.10 أكبر من 1.5.9،
 * و1.5 تساوي 1.5.0. ترجع 1 أو -1 أو 0.
 * لا تقارن النصوص حرفياً أبداً.
 */
export function compareVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const aPart = aParts[i] ?? 0;
    const bPart = bParts[i] ?? 0;
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  return 0;
}

/** هل الإصدار `latest` أحدث من الإصدار `current`؟ */
export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0;
}

/** أول سطر مفيد من ملاحظات الإصدار، مختصراً في سطر واحد. */
export function firstNewsLine(body: string): string {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (const line of lines) {
    // تجاهل عناوين ماركداون مثل "## الجديد"
    if (line.startsWith("#")) continue;
    // إزالة بادئة رأس الإصدار مثل "v1.5.1 — " إن وجدت
    const withoutHeader = line.replace(/^[vV]?\d+(?:\.\d+)*\s*[-—–:]\s*/, "");
    const text = (withoutHeader.length > 0 ? withoutHeader : line)
      .replace(/^[-*]\s+/, "")
      .trim();
    if (text.length === 0) continue;
    return text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text;
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** يستخرج عنصر هذا المستودع من رد الواجهة، أو null إن كان الرد سيئاً. */
function parseLatest(data: unknown): LatestRelease | null {
  if (!isRecord(data)) return null;
  const latest = data["latest"];
  if (!Array.isArray(latest)) return null;
  for (const item of latest) {
    if (!isRecord(item)) continue;
    if (item["repo"] !== REPO_NAME) continue;
    const tag = item["tag"];
    const apkUrl = item["apkUrl"];
    if (typeof tag !== "string" || tag.trim().length === 0) return null;
    if (typeof apkUrl !== "string" || !apkUrl.startsWith("http")) return null;
    const body = item["body"];
    return {
      repo: REPO_NAME,
      tag,
      apkUrl,
      body: typeof body === "string" ? body : "",
    };
  }
  return null;
}

/**
 * يجلب آخر إصدار منشور لهذا المستودع.
 * أي فشل (لا إنترنت، انتهاء المهلة، رد سيئ) يرجع null بصمت.
 */
export async function fetchLatestRelease(): Promise<LatestRelease | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(LATEST_URL, { signal: controller.signal });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    return parseLatest(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * يفحص وجود تحديث: يرجع معلومات التحديث إن وُجد إصدار أحدث،
 * وnull في غير ذلك (لا تحديث، أو فشل الفحص).
 * لا يرمي أي خطأ أبداً.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const latest = await fetchLatestRelease();
    if (!latest) return null;
    const version = normalizeVersion(latest.tag);
    if (version.length === 0) return null;
    if (!isNewerVersion(version, CURRENT_VERSION)) return null;
    return {
      version,
      tag: latest.tag,
      apkUrl: latest.apkUrl,
      whatsNew: firstNewsLine(latest.body),
    };
  } catch {
    return null;
  }
}

/** يفتح رابط APK في المتصفح الخارجي. */
export function openApkUrl(apkUrl: string): void {
  try {
    const opened = window.open(apkUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      const link = document.createElement("a");
      link.href = apkUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  } catch {
    // لا شيء: زر التحديث لا يوقف التطبيق أبداً.
  }
}

// ——— التخزين المحلي: الفحص مرة في اليوم، و"لا تذكرني اليوم" ———

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // التخزين غير متاح: نكمل بدون حفظ.
  }
}

function todayKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** هل مرّ يوم كامل على آخر فحص تلقائي؟ (الفحص اليدوي لا يعتمد على هذا) */
export function shouldAutoCheck(): boolean {
  const raw = readStorage(LAST_CHECK_KEY);
  if (raw === null) return true;
  const last = Number(raw);
  if (Number.isNaN(last)) return true;
  return Date.now() - last >= ONE_DAY_MS;
}

/** يسجّل وقت الفحص التلقائي (يُستدعى قبل الجلب حتى عند الفشل). */
export function markAutoChecked(): void {
  writeStorage(LAST_CHECK_KEY, String(Date.now()));
}

/** هل ضغط المستخدم "لا تذكرني اليوم" على هذا الإصدار اليوم؟ */
export function isDismissedToday(version: string): boolean {
  try {
    const parsed: unknown = JSON.parse(readStorage(DISMISSED_KEY) ?? "null");
    if (!isRecord(parsed)) return false;
    return parsed["date"] === todayKey() && parsed["version"] === version;
  } catch {
    return false;
  }
}

/** يخزّن "لا تذكرني اليوم" لتاريخ اليوم وهذا الإصدار فقط. */
export function dismissForToday(version: string): void {
  writeStorage(
    DISMISSED_KEY,
    JSON.stringify({ date: todayKey(), version }),
  );
}
