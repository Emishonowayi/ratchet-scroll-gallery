"use client";

const navLinks = [
  { label: "INDEX", underline: false },
  { label: "WORK", underline: true },
  { label: "STUDIO", underline: false },
];

export default function CornerNav() {
  return (
    <>
      {/* Top Left — Navigation */}
      <nav
        className="fixed top-5 left-5 z-50 flex gap-4"
        aria-label="Primary navigation"
      >
        {navLinks.map(({ label, underline }) => (
          <a
            key={label}
            href="#"
            className={`font-mono text-[13px] text-black uppercase leading-[1.5]${underline ? " underline underline-offset-2" : ""}`}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Top Right — Contact */}
      <div className="fixed top-5 right-5 z-50">
        <a
          href="mailto:info@studioagar.com"
          className="font-mono text-[13px] text-black uppercase leading-[1.5]"
        >
          INFO@STUDIOAGAR.COM
        </a>
      </div>

      {/* Bottom Left — Credit */}
      <div className="fixed bottom-5 left-5 z-50">
        <p className="font-mono text-[13px] text-black uppercase leading-[1.5]">
          CRAFTED BY{" "}
          <a
            href="https://x.com/Emishonowayi"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >EMISHO VICTOR</a>
        </p>
      </div>

      {/* Bottom Right — Legal */}
      <div className="fixed bottom-5 right-5 z-50 flex gap-4">
        {["TERMS", "PRIVACY"].map((label) => (
          <a
            key={label}
            href="#"
            className="font-mono text-[13px] text-black uppercase leading-[1.5]"
          >
            {label}
          </a>
        ))}
      </div>
    </>
  );
}
