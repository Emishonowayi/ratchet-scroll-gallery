"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function IntroScreen() {
  const [exiting, setExiting] = useState(false);

  return (
    <>
      {/* ── Mobile gate — permanent, no carousel ─────────────────────────── */}
      <div className="flex md:hidden fixed inset-0 bg-[#f0f0f0] z-[200] items-center justify-center p-5 select-none">
        <p className="font-mono text-[13px] text-black uppercase text-center leading-[1.5]">
          Mobile support is coming soon.
          <br />
          Please view on desktop.
        </p>
      </div>

      {/* ── Desktop intro — hidden on mobile, fades out on click ──────────── */}
      <AnimatePresence>
        {!exiting && (
          <motion.div
            className="hidden md:flex fixed inset-0 bg-[#f0f0f0] z-[100] items-center justify-center cursor-pointer select-none"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={() => setExiting(true)}
          >
            <p className="font-mono text-[14px] text-black uppercase text-center leading-[1.4] max-w-[560px] px-5">
              This website uses sound. Click anywhere to continue with sound on.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
