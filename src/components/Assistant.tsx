import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, MessageSquare, X, Volume2, VolumeX, Phone, MessageCircle, MapPin, Store } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { askAssistant } from "@/lib/assistant";
import { formatSyp, formatUsd, whatsappLink, type Offer } from "@/lib/market";

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  offers?: Offer[];
};

type VoiceStatus = {
  text: string;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
} | null;

// اللغة العربية المستخدمة في كل مكان في التطبيق (نفسها في كود الويب القديم)
const AR_LOCALE = "ar-SA";

export function Assistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "assistant",
      text: "أهلاً بك! أنا مساعد سوق قرية أبو جرين. اسألني عن أي منتج أو دكان وسأساعدك بكل ود.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceStatusTimerRef = useRef<number | null>(null);
  const nativeStopRequestedRef = useRef(false);
  const ttsLangCheckedRef = useRef(false);
  const ttsLangSupportedRef = useRef(true);

  const showVoiceStatus = (text: string, actionLabel?: string, onAction?: () => void) => {
    setVoiceStatus({ text, actionLabel, onAction });
    if (voiceStatusTimerRef.current) window.clearTimeout(voiceStatusTimerRef.current);
    voiceStatusTimerRef.current = window.setTimeout(() => setVoiceStatus(null), 8000);
  };

  const stopSpeaking = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.stop();
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore stop errors
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) void stopSpeaking();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (voiceStatusTimerRef.current) window.clearTimeout(voiceStatusTimerRef.current);
      void stopSpeaking();
    };
  }, []);

  const speakText = async (text: string) => {
    if (isMuted) return;

    // التطبيق الأصلي (أندرويد): محرك تحويل النص إلى كلام الأصلي عبر إضافة Capacitor
    if (Capacitor.isNativePlatform()) {
      try {
        if (!ttsLangCheckedRef.current) {
          ttsLangCheckedRef.current = true;
          try {
            const { supported } = await TextToSpeech.isLanguageSupported({ lang: AR_LOCALE });
            ttsLangSupportedRef.current = supported;
          } catch {
            // إن فشل الفحص نفسه، نحاول القراءة على أي حال
            ttsLangSupportedRef.current = true;
          }
        }
        if (!ttsLangSupportedRef.current) {
          showVoiceStatus(
            "الصوت العربي غير مثبّت على هذا الجهاز — ثبّت بيانات الصوت العربي من إعدادات تحويل النص إلى كلام.",
            "تثبيت الصوت",
            () => {
              void TextToSpeech.openInstall().catch(() => undefined);
            }
          );
          return;
        }
        await TextToSpeech.stop();
        await TextToSpeech.speak({ text, lang: AR_LOCALE, rate: 1.0, pitch: 1.0, volume: 1.0 });
      } catch (e) {
        console.error("Native TTS error:", e);
        showVoiceStatus("تعذّرت قراءة الرد صوتياً على هذا الجهاز.");
      }
      return;
    }

    // المتصفح: واجهة الويب كما كانت
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      showVoiceStatus("متصفحك لا يدعم قراءة النص صوتياً.");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = AR_LOCALE;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis error:", e);
      showVoiceStatus("تعذّرت قراءة الرد صوتياً.");
    }
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText ?? input).trim();
    if (!q || loading) return;

    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!queryText) setInput("");
    setLoading(true);

    const history = newMessages.slice(0, -1).map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

    try {
      const res = await askAssistant(q, history);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: res.reply,
        offers: res.offers,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      void speakText(res.reply);
    } catch (err) {
      console.error("Assistant error:", err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: "تعذّر الوصول إلى المساعد الآن، حاول لاحقاً",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const startRecordingNative = async () => {
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        showVoiceStatus("التعرف الصوتي غير متوفر على هذا الجهاز.");
        return;
      }
      let perm = await SpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== "granted") {
        perm = await SpeechRecognition.requestPermissions();
      }
      if (perm.speechRecognition !== "granted") {
        showVoiceStatus("لم تسمح بالميكروفون — فعّل إذن الميكروفون من إعدادات التطبيق ثم حاول مجدداً.");
        return;
      }
      nativeStopRequestedRef.current = false;
      setIsRecording(true);
      const { matches } = await SpeechRecognition.start({
        language: AR_LOCALE,
        maxResults: 1,
        prompt: "تحدث الآن",
        partialResults: false,
        popup: true,
      });
      setIsRecording(false);
      const transcript = matches && matches[0] ? matches[0].trim() : "";
      if (transcript) {
        setInput(transcript);
        void handleSend(transcript);
      }
    } catch (e) {
      setIsRecording(false);
      if (nativeStopRequestedRef.current) {
        nativeStopRequestedRef.current = false;
        return;
      }
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel/i.test(msg)) return;
      console.error("Native speech recognition error:", e);
      showVoiceStatus("تعذّر التعرف على الصوت، حاول مجدداً.");
    }
  };

  const startRecording = () => {
    // التطبيق الأصلي: التعرف الصوتي الأصلي عبر إضافة Capacitor
    if (Capacitor.isNativePlatform()) {
      void startRecordingNative();
      return;
    }

    // المتصفح: واجهة الويب كما كانت
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      showVoiceStatus("متصفحك لا يدعم التعرف الصوتي.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = AR_LOCALE;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          void handleSend(transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        showVoiceStatus("تعذّر التعرف على الصوت، حاول مجدداً.");
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsRecording(false);
      showVoiceStatus("تعذّر بدء التعرف الصوتي.");
    }
  };

  const stopRecording = async () => {
    if (Capacitor.isNativePlatform()) {
      nativeStopRequestedRef.current = true;
      try {
        await SpeechRecognition.stop();
      } catch {
        // Ignore stop error
      }
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    setIsRecording(false);
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 rtl" dir="rtl">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105"
          aria-label="المساعد الصوتي والنصي"
        >
          <Mic className="h-6 w-6 animate-pulse" />
          <span className="font-bold text-sm hidden sm:inline">مساعد السوق</span>
        </button>
      )}

      {isOpen && (
        <div className="flex flex-col h-[520px] w-[360px] max-w-[90vw] rounded-2xl border bg-background shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2 font-bold text-base">
              <MessageSquare className="h-5 w-5" />
              <span>مساعد سوق أبو جرين</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (next) void stopSpeaking();
                }}
                className="p-1.5 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground transition-colors"
                title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                onClick={() => {
                  void stopSpeaking();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground transition-colors"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-card text-card-foreground border shadow-sm rounded-bl-none"
                  }`}
                >
                  <p>{m.text}</p>
                </div>

                {m.offers && m.offers.length > 0 && (
                  <div className="w-full mt-2 space-y-2">
                    {m.offers.map((offer) => (
                      <div
                        key={offer.id}
                        className="rounded-xl border bg-card p-3 shadow-sm space-y-2 text-card-foreground"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm">{offer.name}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Store className="h-3 w-3" />
                              {offer.shop.name} ({offer.shop.owner_name})
                            </p>
                          </div>
                          <div className="text-left font-bold text-primary text-sm">
                            <div>{formatSyp(offer.price_syp)}</div>
                            <div className="text-xs text-muted-foreground">{formatUsd(offer.price_usd)}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {offer.shop.address}
                          </span>
                          <span>المخزون: {offer.stock} {offer.unit}</span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <a
                            href={`tel:${offer.shop.phone}`}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            اتصل بالدكان
                          </a>
                          <a
                            href={whatsappLink(offer.shop.phone, offer.name, offer.unit)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            احجز عبر واتساب
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-card text-card-foreground border shadow-sm rounded-2xl rounded-bl-none px-4 py-3 text-sm animate-pulse">
                  المساعد يفكر ويرد...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {voiceStatus && (
            <div className="flex items-center justify-between gap-2 border-t bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              <span>{voiceStatus.text}</span>
              <span className="flex shrink-0 items-center gap-2">
                {voiceStatus.actionLabel && voiceStatus.onAction && (
                  <button onClick={voiceStatus.onAction} className="font-bold underline">
                    {voiceStatus.actionLabel}
                  </button>
                )}
                <button
                  onClick={() => setVoiceStatus(null)}
                  aria-label="إغلاق التنبيه"
                  className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}

          <div className="p-3 border-t bg-background flex items-center gap-2">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-destructive text-destructive-foreground animate-bounce"
                title="إيقاف التسجيل الصوتي"
              >
                <MicOff className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                title="تحدث بالصوت"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اسأل المساعد (مثال: شو عند دكان أبو أحمد؟)..."
              className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              title="إرسال"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
