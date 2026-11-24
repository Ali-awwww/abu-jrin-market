import { useState } from "react";
import { Button } from "@/components/ui/button";
import { isPhotoReminderDue, isPhotoReminderSnoozed, snoozePhotoReminder } from "@/lib/market";

/**
 * تذكير لطيف للبائع بتجديد صورة المنتج بعد 5 ساعات من آخر تحديث.
 * اختياري تماماً: لا يمنع البيع، ولا يحذف المنتج، ولا تنتهي صلاحية الصورة.
 * يظهر للبائع فقط (في لوحة البائع وعند فتح المنتج)، ولا يظهر للمشتري أبداً.
 */
export function PhotoReminder({ productId, updatedAt, hasPhoto, onUpdateNow }: {
  productId: string;
  updatedAt: string | undefined | null;
  hasPhoto: boolean;
  onUpdateNow: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden || !hasPhoto || !isPhotoReminderDue(updatedAt) || isPhotoReminderSnoozed(productId)) return null;
  return (
    <div className="space-y-2 rounded-2xl border-2 border-accent bg-card p-3">
      <p className="text-lg font-bold">📷 مرت 5 ساعات على صورة هذا المنتج، هل تريد تحديثها؟</p>
      <p className="text-base text-muted-foreground">التذكير اختياري: لن يتوقف البيع، ولن تُحذف الصورة، ويمكنك تجاهله متى شئت.</p>
      <div className="grid gap-2">
        <Button size="xl" onClick={onUpdateNow}>حدّث الصورة الآن</Button>
        <Button size="xl" variant="outline" onClick={() => { snoozePhotoReminder(productId); setHidden(true); }}>لاحقاً / ذكّرني لاحقاً</Button>
      </div>
    </div>
  );
}
