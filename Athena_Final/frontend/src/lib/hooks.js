import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Athena` : "Athena — Executive Intelligence";
  }, [title]);
}

export function useScrollTopOnNavigate(pathname) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
}

export function useElapsed(active) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!active) return;
    setMs(0);
    const t0 = Date.now();
    const iv = setInterval(() => setMs(Date.now() - t0), 200);
    return () => clearInterval(iv);
  }, [active]);
  return ms;
}

export function useRespectMotion() {
  return !!useReducedMotion();
}