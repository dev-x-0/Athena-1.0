import React, { useState, useEffect, useRef } from 'react';

export default function SpearCenterpiece({ progress = 0, interactive = true, ambient = false }) {
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!interactive) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dx = e.clientX - centerX;
      const headY = rect.top + rect.height * 0.22;
      const distToHead = Math.hypot(e.clientX - centerX, e.clientY - headY);

      if (distToHead < 85) {
        setLocked(true);
        setRotation(0);
      } else {
        setLocked(false);
        const springAngle = Math.max(-2, Math.min(2, (dx / (rect.width / 2)) * 2));
        setRotation(springAngle);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  const chargeHeight = Math.min(100, Math.max(0, progress));

  return (
    <div
      ref={containerRef}
      className={`cp ${ambient ? 'cp--ambient' : ''}`}
      style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      <svg viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="spearCharge" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#C9A96A" stopOpacity="0.15" />
            <stop offset={`${chargeHeight}%`} stopColor="#E6D2A2" />
            <stop offset={`${chargeHeight}%`} stopColor="rgba(240, 234, 220, 0.08)" />
            <stop offset="100%" stopColor="rgba(240, 234, 220, 0.05)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Survey geometry radiating from spearhead */}
        <g stroke="rgba(201, 169, 106, 0.22)" strokeWidth="1" fill="none">
          <circle cx="400" cy="220" r="120" strokeDasharray="4 4" />
          <circle cx="400" cy="220" r="210" strokeDasharray="2 6" />
          <rect x="300" y="120" width="200" height="200" transform="rotate(45 400 220)" />
          <rect x="330" y="150" width="140" height="140" transform="rotate(22.5 400 220)" />
          <line x1="140" y1="220" x2="660" y2="220" strokeDasharray="2 4" />
          <line x1="400" y1="40" x2="400" y2="720" strokeDasharray="2 4" />
        </g>

        {/* Data comets */}
        <g>
          <circle cx="280" cy="220" r="2.5" fill="#E6D2A2" filter="url(#glow)">
            <animate attributeName="cx" values="180;620;180" dur="9s" repeatCount="indefinite" />
            <animate attributeName="cy" values="170;310;170" dur="9s" repeatCount="indefinite" />
          </circle>
          <circle cx="520" cy="180" r="2" fill="#C9A96A">
            <animate attributeName="cx" values="620;220;620" dur="12s" repeatCount="indefinite" />
            <animate attributeName="cy" values="140;380;140" dur="12s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Shield and laurel fragments */}
        <g opacity="0.4" stroke="#C9A96A" strokeWidth="1.2" fill="none">
          <path d="M 270 490 C 250 380, 270 270, 350 190" strokeDasharray="6 4" />
          <path d="M 530 490 C 550 380, 530 270, 450 190" strokeDasharray="6 4" />
        </g>

        {/* Reticle lock state */}
        {locked && (
          <g transform="translate(400, 220)">
            <circle r="38" stroke="#E6D2A2" strokeWidth="1.5" fill="rgba(201, 169, 106, 0.08)" />
            <path d="M -48 0 H -26 M 26 0 H 48 M 0 -48 V -26 M 0 26 V 48" stroke="#E6D2A2" strokeWidth="1.5" />
          </g>
        )}

        {/* Spear shaft (charging instrument) */}
        <line x1="400" y1="180" x2="400" y2="680" stroke="url(#spearCharge)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Spearhead */}
        <g fill="#0C0B09" stroke={locked ? "#E6D2A2" : "#C9A96A"} strokeWidth="2.5">
          <path d="M 400 95 L 428 180 L 400 162 L 372 180 Z" />
          <path d="M 400 162 V 220" stroke="#C9A96A" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
