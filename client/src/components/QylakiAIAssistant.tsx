import { useState } from "react";
import { Bot, ChevronDown, MessageCircle, Sparkles, X } from "lucide-react";
import { AIChatBox, type Message } from "./AIChatBox";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";

export default function QylakiAIAssistant() {
  const { language } = useTheme(); const ar = language === "ar"; const [open, setOpen] = useState(false); const [messages, setMessages] = useState<Message[]>([]);
  const chat = trpc.ai.chat.useMutation({ onSuccess: response => setMessages(prev => [...prev, { role: "assistant", content: response.content }]), onError: () => setMessages(prev => [...prev, { role: "assistant", content: ar ? "تعذر الرد الآن. يمكنك إرسال طلب مشروع أو حجز مكالمة وسنساعدك مباشرة." : "I could not reply right now. You can start a project or book a call and we’ll help directly." }]) });
  const send = (content: string) => { const next = [...messages, { role: "user" as const, content }]; setMessages(next); chat.mutate({ messages: next.filter(item => item.role !== "system").map(item => ({ role: item.role as "user" | "assistant", content: item.content })), language }); };
  return <div className="qylaki-ai"><button className="ai-launcher" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={ar ? "افتح مساعد QYLAKI" : "Open QYLAKI assistant"}>{open ? <X size={20}/> : <><span className="ai-launcher-glow"><Sparkles size={17}/></span><span className="ai-launcher-label">{ar ? "اسأل QYLAKI" : "Ask QYLAKI"}</span></>}</button>{open && <section className="ai-panel" aria-label={ar ? "مساعد QYLAKI" : "QYLAKI assistant"}><header><div className="ai-panel-title"><span><Bot size={18}/></span><div><strong>{ar ? "مساعد QYLAKI" : "QYLAKI assistant"}</strong><small>{ar ? "إجابة سريعة عن خدماتنا" : "Quick answers about our studio"}</small></div></div><button onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"}><ChevronDown size={18}/></button></header><AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height={355} emptyStateMessage={ar ? "اسأل عن الخدمات، الوقت، أو بداية مشروعك" : "Ask about services, timing, or starting a project"} placeholder={ar ? "اكتب سؤالك..." : "Ask a question..."} suggestedPrompts={ar ? ["ما الخدمات التي تقدمونها؟", "كيف أبدأ مشروعاً؟"] : ["What do you build?", "How do I start?"]}/></section>}</div>;
}
