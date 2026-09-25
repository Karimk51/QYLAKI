import { useEffect } from "react";
import { useLocation } from "wouter";

declare global { interface Window { dataLayer: unknown[]; gtag?: (...args: unknown[]) => void; } }
const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
export function trackEvent(name: string, params?: Record<string, string | number>) { if (typeof window !== "undefined" && window.gtag) window.gtag("event", name, params ?? {}); }
export default function Analytics() { const [location] = useLocation(); useEffect(() => { if (!measurementId || document.querySelector(`script[data-ga="${measurementId}"]`)) return; window.dataLayer = window.dataLayer || []; window.gtag = (...args: unknown[]) => window.dataLayer.push(args); const script = document.createElement("script"); script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`; script.dataset.ga = measurementId; document.head.appendChild(script); window.gtag("js", new Date()); window.gtag("config", measurementId, { anonymize_ip: true, send_page_view: false }); }, []); useEffect(() => { if (measurementId && window.gtag) { window.gtag("event", "page_view", { page_path: location, page_title: document.title }); } }, [location]); return null; }
