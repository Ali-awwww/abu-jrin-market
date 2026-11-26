import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send, MessageSquare, X, Volume2, VolumeX, Phone, MessageCircle, MapPin, Store } from "lucide-react";
import { askAssistant } from "@/lib/assistant";
import { formatSyp, formatUsd, whatsappLink, type Offer } from "@/lib/market";

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  offers?: Offer[];
};

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const speakText = (text: string) => {
    if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-SA";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis error:", e);
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
      speakText(res.reply);
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

  const startRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم التعرف الصوتي.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ar-SA";
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
          handleSend(transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
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
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg hover:bg-primary-foreground/10 text-primary-foreground transition-colors"
                title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
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
