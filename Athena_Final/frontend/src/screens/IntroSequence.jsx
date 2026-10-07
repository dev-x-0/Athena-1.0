import { animate, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AthenaMark from "../components/AthenaMark";

/**
 * Brand opening.
 * 1. If public/intro.mp4 exists it is played as the opening sequence.
 * 2. Otherwise a motion-built intro plays the same visual grammar:
 *    ink canvas · mark draw-in · progress frame + counting percentage.
 * Both paths end in a split-curtain reveal into authentication.
 */
export default function IntroSequence({ onDone }) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState("brand");       // brand | video
  const [videoReady, setVideoReady] = useState(false);
  const [n, setN] = useState(0);
  const [reveal, setReveal] = useState(false);
  const doneRef = useRef(false);
  const videoRef = useRef(null);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setReveal(true);
    setTimeout(onDone, 900);
  };

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(finish, 350);
      return () => clearTimeout(t);
    }
    const controls = animate(0, 100, {
      duration: 3.9,
      ease: [0.4, 0, 0.2, 1],
      onUpdate: (v) => setN(Math.round(v)),
      onComplete: () => finish(),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    if (mode === "video" && videoRef.current) {
      videoRef.current.play().catch(() => setMode("brand"));
    }
  }, [mode]);

  const revealEase = [0.76, 0, 0.24, 1];

  return (
    <div className="intro" aria-label="Athena opening animation">
      {/* curtains — part to reveal the app */}
      <motion.div className="curtain curtain--t" initial={{ y: 0 }} animate={reveal ? { y: "-100.5%" } : { y: 0 }} transition={{ duration: 0.85, ease: revealEase }} />
      <motion.div className="curtain curtain--b" initial={{ y: 0 }} animate={reveal ? { y: "100.5%" } : { y: 0 }} transition={{ duration: 0.85, ease: revealEase }} />

      <motion.div className="intro-content" animate={{ opacity: reveal ? 0 : 1 }} transition={{ duration: 0.25 }}>
        {/* provided brand video (auto-detected) */}
        <video
          ref={videoRef}
          className={`intro-video${mode === "video" && videoReady ? " on" : ""}`}
          src={`${import.meta.env.BASE_URL}intro.mp4`}
          muted
          playsInline
          preload="auto"
          onCanPlay={() => { setVideoReady(true); setMode("video"); }}
          onError={() => setMode("brand")}
          onEnded={finish}
        />

        {/* fallback brand intro — same grammar as the video */}
        <motion.div
          className="intro-brand"
          initial={{ opacity: 1 }}
          animate={{ opacity: mode === "video" && videoReady ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="intro-frame" aria-hidden="true" />
          {mode === "brand" && (
            <div
              className="intro-progress"
              style={{ width: `${n * 0.6}%` }}
              aria-hidden="true"
            />
          )}
          <motion.div
            className="intro-brand-inner"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <AthenaMark size={92} strokeWidth={1.3} />
            <div style={{ textAlign: "center" }}>
              <div style={{ font: "600 19px/1 var(--font-display)", letterSpacing: "0.5em", paddingLeft: "0.5em", color: "var(--text-hi)" }}>
                ATHENA
              </div>
              <div className="eyebrow" style={{ marginTop: 12 }}>Executive Intelligence</div>
            </div>
          </motion.div>
          {mode === "brand" && (
            <div className="intro-count" aria-hidden="true">
              {n}%
            </div>
          )}
        </motion.div>
      </motion.div>

      <button className="btn btn--ghost btn--sm intro-skip" onClick={finish}>
        Skip intro
      </button>
    </div>
  );
}