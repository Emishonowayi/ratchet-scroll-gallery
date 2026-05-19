"use client";

import { useEffect, useRef, useState, useCallback, PointerEvent } from "react";
import { useMotionValue, animate } from "framer-motion";
import { projects } from "../data/projects";
import CarouselItem from "./CarouselItem";
import FocusBrackets from "./FocusBrackets";
import ProjectMetadata from "./ProjectMetadata";
import { ACTIVE_WIDTH, VISIBLE_SLOTS, Y_AT, H_AT, mod, interpolateAt } from "../lib/carouselMath";

// ─── Physics parameters ───────────────────────────────────────────────────────
export interface CarouselParams {
  scrollSensitivity: number; // deltaY → velocity impulse scale (fling mode)
  maxVelocity: number;       // max items/frame
  momentumDecay: number;     // velocity multiplier per frame (free-scroll phase)
  snapThreshold: number;     // velocity below which snap engages
  snapStrength: number;      // spring pull per frame toward nearest integer
  snapDamping: number;       // velocity damping multiplier during snap
  stepThreshold: number;     // accumulated deltaY (px) to trigger one step
  flingThreshold: number;    // single-event deltaY (px) that switches to fling mode
}

export const DEFAULT_PARAMS: CarouselParams = {
  scrollSensitivity: 0.003,
  maxVelocity: 0.5,
  momentumDecay: 0.88,
  snapThreshold: 0.05,
  snapStrength: 0.3,
  snapDamping: 0.5,
  stepThreshold: 50,
  flingThreshold: 40,
};

// ─── Reel container height (computed from Figma slot positions) ───────────────
const REEL_HEIGHT = (() => {
  const farY = Y_AT[Math.min(VISIBLE_SLOTS, Y_AT.length - 1)];
  const farH = H_AT[Math.min(VISIBLE_SLOTS, H_AT.length - 1)];
  return (farY + farH / 2) * 2 + H_AT[0];
})();

const TOTAL = projects.length;

// Pixels of vertical drag that equals one item advance
const DRAG_PIXELS_PER_ITEM = 260;

// ─── Component ────────────────────────────────────────────────────────────────
export default function WorkCarousel() {
  const positionMV  = useMotionValue(0); // continuous float position
  const scrollingMV = useMotionValue(0); // 0 = settled, 1 = peak velocity

  // centerSlot is the unbounded integer slot index (for correct infinite loop)
  const [centerSlot, setCenterSlot] = useState(0);
  const centerSlotRef = useRef(0);


  const containerRef = useRef<HTMLDivElement>(null);
  const reelRef      = useRef<HTMLDivElement>(null); // drag hit zone
  const rafRef       = useRef<number>(0);
  const phys         = useRef({ velocity: 0, running: false });
  const paramsRef    = useRef<CarouselParams>({ ...DEFAULT_PARAMS });

  // Step/fling scroll accumulator
  const scrollAccum = useRef({ delta: 0, flinging: false, flingTimer: 0 });

  // Tracks the intended target slot for sequential steps (avoids duplicate targets
  // when animation hasn't yet crossed the integer boundary)
  const intendedSlot = useRef(0);

  // Click-to-navigate animation controls
  const animControls = useRef<{ stop: () => void } | null>(null);
  const animUnsub    = useRef<(() => void) | null>(null);

  // Web Audio — ratchet SFX
  // AudioContext must be created inside a direct user gesture (pointerdown/keydown).
  // We unlock it eagerly on first interaction so it's ready when the RAF fires sounds.
  const audioCtx    = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const unlock = async () => {
      if (audioCtx.current) return;
      try {
        const ctx = new AudioContext();
        audioCtx.current = ctx;
        await ctx.resume();
        const r       = await fetch("/audio/ratchet.mp3");
        const arrBuf  = await r.arrayBuffer();
        audioBuffer.current = await ctx.decodeAudioData(arrBuf);
      } catch {}
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown",     unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown",     unlock);
      audioCtx.current?.close();
    };
  }, []);

  const playRatchet = useRef(() => {
    const ctx = audioCtx.current;
    const buf = audioBuffer.current;
    if (!ctx || !buf || ctx.state !== "running") return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {}
  });

  // Drag state
  const drag = useRef({
    active: false,
    hasMoved: false, // cursor only switches after actual movement
    startY: 0,
    startPosition: 0,
    recent: [] as { y: number; t: number }[],
  });

  // ── Physics loop ────────────────────────────────────────────────────────────
  const runLoop = useCallback(() => {
    const p   = phys.current;
    const par = paramsRef.current;

    const pos     = positionMV.get();
    const nearest = Math.round(pos);
    const dist     = nearest - pos;
    const absVel   = Math.abs(p.velocity);

    if (absVel > par.snapThreshold) {
      // ── Free-scroll phase: momentum decay
      p.velocity *= par.momentumDecay;
    } else {
      // ── Snap phase: spring toward nearest integer
      const spring = dist * par.snapStrength;
      p.velocity = (p.velocity + spring) * par.snapDamping;
    }

    const newPos = pos + p.velocity;
    positionMV.set(newPos);

    // Scroll intensity drives bracket contraction (0 = rest, 1 = max speed)
    scrollingMV.set(Math.min(Math.abs(p.velocity) / par.maxVelocity, 1));

    // Update center when it crosses an integer boundary
    const newCenter = Math.round(newPos);
    if (newCenter !== centerSlotRef.current) {
      centerSlotRef.current = newCenter;
      setCenterSlot(newCenter);
      playRatchet.current();
    }

    // Settle check
    const settled = Math.abs(p.velocity) < 0.0005 && Math.abs(Math.round(newPos) - newPos) < 0.0008;
    if (settled) {
      const snapped = Math.round(newPos);
      positionMV.set(snapped);
      scrollingMV.set(0);
      centerSlotRef.current = snapped;
      intendedSlot.current  = snapped;
      setCenterSlot(snapped);
      p.velocity = 0;
      p.running  = false;
      return; // stop RAF
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, [positionMV, scrollingMV]);

  const startLoop = useCallback(() => {
    if (phys.current.running) return;
    phys.current.running = true;
    rafRef.current = requestAnimationFrame(runLoop);
  }, [runLoop]);

  // ── Click-to-navigate ────────────────────────────────────────────────────────
  const stopNavigation = useCallback(() => {
    animControls.current?.stop();
    animControls.current = null;
    animUnsub.current?.();
    animUnsub.current = null;
  }, []);

  const navigateToSlot = useCallback((targetSlot: number, snap = false) => {
    stopNavigation();
    cancelAnimationFrame(rafRef.current);
    phys.current.running = false;
    phys.current.velocity = 0;

    animUnsub.current = positionMV.on("change", (pos) => {
      const newCenter = Math.round(pos);
      if (newCenter !== centerSlotRef.current) {
        centerSlotRef.current = newCenter;
        setCenterSlot(newCenter);
        playRatchet.current();
      }
    });

    // snap=true: stiff overdamped spring (~80ms, zero bounce) for step/key nav
    // snap=false: softer spring for click-to-navigate (feels like traveling distance)
    animControls.current = animate(positionMV, targetSlot, {
      type: "spring",
      stiffness: snap ? 800 : 200,
      damping:   snap ? 80  : 30,
      onComplete: () => {
        animUnsub.current?.();
        animUnsub.current    = null;
        animControls.current = null;
        positionMV.set(targetSlot);
        scrollingMV.set(0);
        centerSlotRef.current = targetSlot;
        intendedSlot.current  = targetSlot;
        setCenterSlot(targetSlot);
      },
    });
  }, [positionMV, scrollingMV, stopNavigation]);

  // ── Wheel handler ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const par = paramsRef.current;
      const sa  = scrollAccum.current;

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      if (e.deltaMode === 2) delta *= window.innerHeight;

      // A large single-event delta is an intentional fling gesture
      if (Math.abs(delta) >= par.flingThreshold) {
        sa.flinging = true;
        clearTimeout(sa.flingTimer);
        sa.flingTimer = window.setTimeout(() => {
          sa.flinging = false;
          sa.delta    = 0;
          intendedSlot.current = centerSlotRef.current; // resync after fling
        }, 350) as unknown as number;
      }

      if (sa.flinging) {
        // Free-scroll / momentum mode — bypasses step logic, uses physics engine
        stopNavigation();
        sa.delta = 0;
        phys.current.velocity += delta * par.scrollSensitivity;
        phys.current.velocity = Math.max(
          -par.maxVelocity,
          Math.min(par.maxVelocity, phys.current.velocity)
        );
        startLoop();
      } else {
        // Step mode: accumulate delta; each threshold crossed = one precise step
        sa.delta += delta;
        if (Math.abs(sa.delta) >= par.stepThreshold) {
          const dir = sa.delta > 0 ? 1 : -1;
          sa.delta -= dir * par.stepThreshold;
          intendedSlot.current += dir;
          navigateToSlot(intendedSlot.current, true); // snap=true: instant, no wobble
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [startLoop, navigateToSlot, stopNavigation]);

  // ── Keyboard handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const par = paramsRef.current;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        intendedSlot.current += 1;
        navigateToSlot(intendedSlot.current, true);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        intendedSlot.current -= 1;
        navigateToSlot(intendedSlot.current, true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startLoop, navigateToSlot]);

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;

    stopNavigation();
    cancelAnimationFrame(rafRef.current);
    phys.current.running  = false;
    phys.current.velocity = 0;

    drag.current = {
      active: true,
      hasMoved: false,
      startY: e.clientY,
      startPosition: positionMV.get(),
      recent: [{ y: e.clientY, t: e.timeStamp }],
    };

    // Capture pointer so move/up fire even when cursor leaves the reel
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, [positionMV, stopNavigation]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;

    const dy = e.clientY - drag.current.startY;

    // Show grabbing cursor only after crossing the movement threshold
    if (!drag.current.hasMoved && Math.abs(dy) > 5) {
      drag.current.hasMoved = true;
      reelRef.current?.classList.add("cursor-grabbing");
    }

    const newPos = drag.current.startPosition - dy / DRAG_PIXELS_PER_ITEM;
    positionMV.set(newPos);

    // Keep only last 100ms of history for velocity calculation
    drag.current.recent.push({ y: e.clientY, t: e.timeStamp });
    drag.current.recent = drag.current.recent.filter(
      (p) => e.timeStamp - p.t < 100
    );

    // Update center slot so metadata stays in sync
    const newCenter = Math.round(newPos);
    if (newCenter !== centerSlotRef.current) {
      centerSlotRef.current = newCenter;
      setCenterSlot(newCenter);
      playRatchet.current();
    }

    // Show bracket contraction proportional to drag speed
    const instantVel = drag.current.recent.length >= 2
      ? Math.abs(
          (drag.current.recent[drag.current.recent.length - 1].y -
            drag.current.recent[0].y) /
            DRAG_PIXELS_PER_ITEM /
            ((drag.current.recent[drag.current.recent.length - 1].t -
              drag.current.recent[0].t) /
              16.67)
        )
      : 0;
    scrollingMV.set(Math.min(instantVel / paramsRef.current.maxVelocity, 1));
  }, [positionMV, scrollingMV]);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    reelRef.current?.classList.remove("cursor-grabbing");

    // Clean click (no drag movement) → find tapped slot and navigate to it
    if (!drag.current.hasMoved) {
      const reelEl = reelRef.current;
      if (reelEl) {
        const rect = reelEl.getBoundingClientRect();
        const relY  = drag.current.startY - (rect.top + rect.height / 2);
        const pos   = positionMV.get();

        let targetSlot: number | null = null;
        let minDist = Infinity;
        for (let s = centerSlotRef.current - VISIBLE_SLOTS; s <= centerSlotRef.current + VISIBLE_SLOTS; s++) {
          if (s === Math.round(pos)) continue; // skip active slot
          const offset = s - pos;
          const slotY  = interpolateAt(Y_AT, Math.abs(offset)) * (offset >= 0 ? 1 : -1);
          const slotH  = interpolateAt(H_AT, Math.abs(offset));
          if (Math.abs(relY - slotY) <= slotH / 2 + 12) {
            const dist = Math.abs(relY - slotY);
            if (dist < minDist) { minDist = dist; targetSlot = s; }
          }
        }

        if (targetSlot !== null) {
          navigateToSlot(targetSlot);
          return;
        }
      }
    }

    // Compute release velocity from recent movement history (items/frame at 60fps)
    const recent = drag.current.recent;
    let releaseVelocity = 0;
    if (recent.length >= 2) {
      const oldest = recent[0];
      const newest = recent[recent.length - 1];
      const dt = newest.t - oldest.t;
      if (dt > 0) {
        const dyItems = -(newest.y - oldest.y) / DRAG_PIXELS_PER_ITEM;
        releaseVelocity = dyItems / (dt / 16.67); // normalise to per-frame
      }
    }

    // Clamp and hand off to physics engine
    const max = paramsRef.current.maxVelocity;
    phys.current.velocity = Math.max(-max, Math.min(max, releaseVelocity));
    startLoop();
  }, [startLoop, navigateToSlot, positionMV]);

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Debounced project for metadata ───────────────────────────────────────────
  // centerSlot changes many times/sec during fast scroll; debouncing prevents
  // AnimatePresence from building up a queue of stacked exit animations.
  const [metaProject, setMetaProject] = useState(projects[mod(0, TOTAL)]);
  const metaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(() => {
      setMetaProject(projects[mod(centerSlot, TOTAL)]);
    }, 80);
    return () => clearTimeout(metaTimer.current);
  }, [centerSlot]);

  // ── Visible slots ─────────────────────────────────────────────────────────────
  const slots: { slotIndex: number; projectIndex: number }[] = [];
  for (let s = centerSlot - VISIBLE_SLOTS; s <= centerSlot + VISIBLE_SLOTS; s++) {
    slots.push({ slotIndex: s, projectIndex: mod(s, TOTAL) });
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      role="region"
      aria-label="Project archive carousel"
      tabIndex={0}
    >
      {/* Metadata — flanks the reel */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-5 md:px-10">
        <div className="flex items-center w-full max-w-[960px] gap-6 md:gap-8">
          <ProjectMetadata project={metaProject} side="left" />
          <div className="shrink-0" style={{ width: ACTIVE_WIDTH + 20 }} aria-hidden="true" />
          <ProjectMetadata project={metaProject} side="right" />
        </div>
      </div>

      {/* Single fixed focus bracket — sits at the center, reacts to scroll fraction */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <FocusBrackets positionMV={positionMV} />
      </div>

      {/* Image reel — drag zone is scoped to this column */}
      <div
        ref={reelRef}
        className="relative shrink-0 overflow-visible touch-none"
        style={{ width: ACTIVE_WIDTH, height: REEL_HEIGHT }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDragStart={(e) => e.preventDefault()}
      >
        {slots.map(({ slotIndex, projectIndex }) => (
          <CarouselItem
            key={slotIndex}
            slotIndex={slotIndex}
            project={projects[projectIndex]}
            positionMV={positionMV}
            scrollingMV={scrollingMV}
            isActive={slotIndex === centerSlot}
          />
        ))}
      </div>

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {metaProject.index} — {metaProject.title}, {metaProject.category},{" "}
        {metaProject.year}
      </div>
    </div>
  );
}
