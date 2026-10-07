/* Inline recreation of the Athena foil emblem:
   spear-formed "A", shield arc (left), laurel branch (right).
   Swap for the supplied asset by replacing the paths below. */
export default function AthenaMark({ size = 28, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Athena monogram"
      {...rest}
    >
      <path d="M32 2.5c-2.9 4.2-2.9 7.9 0 11.4 2.9-3.5 2.9-7.2 0-11.4Z" />
      <path d="M32 14v44" />
      <path d="M28.2 17.6h7.6" />
      <path d="M12.5 58 32 16.5 51.5 58" />
      <path d="M21.8 43.5h20.4" />
      <path d="M17.5 47.5c7-4.6 18-4.9 26-.8" strokeWidth="1.1" />
      <path d="M25.5 44.2c.6-2.4 2.2-4 4.6-4.9-.3 2.5-1.7 4.2-4.6 4.9Z" strokeWidth="1.1" />
      <path d="M34.5 43.7c1.8-1.9 3.8-2.7 6.2-2.4-1.2 2.2-3.2 3.1-6.2 2.4Z" strokeWidth="1.1" />
      <path d="M19.5 25.5C12.7 29.8 10 38.6 14.6 47.6c2.3 4.4 5.6 7.6 9 9.4" />
      <path d="M23.8 29.6c-5 3.4-6.8 9.6-3.6 16.2 1.5 3 3.6 5.4 5.9 7" strokeWidth="1.1" />
      <path d="M45.5 54.5C52.6 45 55.2 31.5 50.8 18.5" />
      <path d="M48.9 47.2c2.8-.9 5.4-.4 7.6 1.6-2.7 1.4-5.3 1.2-7.6-1.6Z" strokeWidth="1.1" />
      <path d="M50.6 39.2c2.8-.9 5.4-.4 7.6 1.6-2.7 1.4-5.3 1.2-7.6-1.6Z" strokeWidth="1.1" />
      <path d="M47.9 31.4c-2.9-.7-5.5 0-7.6 2.2 2.8 1.2 5.4.8 7.6-2.2Z" strokeWidth="1.1" />
      <path d="M50 23.4c2.9-.8 5.5-.2 7.6 1.9-2.8 1.3-5.4.9-7.6-1.9Z" strokeWidth="1.1" />
    </svg>
  );
}

export function Brandline({ size = 30 }) {
  return (
    <div className="brandline">
      <img src={`${import.meta.env.BASE_URL}athena-logo.png`} alt="Athena emblem" width={size} height={size} style={{ objectFit: "contain", borderRadius: 8 }} />
      <div>
        <div className="wordmark">ATHENA</div>
        <div className="tag">Executive Intelligence</div>
      </div>
    </div>
  );
}

{/* Left Column: Branding + Center Logo + Quote */}
<div className="flex-1 flex flex-col justify-between p-12 border-r border-slate-800/60">
  <div className="text-xl font-bold tracking-widest text-amber-100">ATHENA</div>

  {/* CENTER BLANK AREA */}
  <div className="flex items-center justify-center my-auto">
    <AthenaMark className="w-72 h-72 md:w-80 md:h-80" />
  </div>

  <div>
    <p className="text-xl text-slate-200 italic">“What gets measured gets managed.”</p>
    <p className="text-xs text-slate-400 tracking-wider uppercase">— PETER DRUCKER</p>
  </div>
</div>