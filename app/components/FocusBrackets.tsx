"use client";

import { useTransform, MotionValue, motion } from "framer-motion";
import { ACTIVE_WIDTH, ACTIVE_HEIGHT } from "../lib/carouselMath";

const BRACKET = 12;
const OFFSET  = 10;

interface FocusBracketsProps {
  positionMV: MotionValue<number>;
}

function Corner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop  = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";

  return (
    <div
      className="absolute"
      style={{
        top:    isTop  ? -OFFSET : undefined,
        bottom: !isTop ? -OFFSET : undefined,
        left:   isLeft ? -OFFSET : undefined,
        right:  !isLeft ? -OFFSET : undefined,
        width:  BRACKET,
        height: BRACKET,
      }}
    >
      <div
        className="absolute bg-black"
        style={{
          width: 1, height: BRACKET, top: 0,
          left:  isLeft ? 0 : undefined,
          right: !isLeft ? 0 : undefined,
        }}
      />
      <div
        className="absolute bg-black"
        style={{
          height: 1, width: BRACKET, left: 0,
          top:    isTop  ? 0 : undefined,
          bottom: !isTop ? 0 : undefined,
        }}
      />
    </div>
  );
}

export default function FocusBrackets({ positionMV }: FocusBracketsProps) {
  // Distance from the nearest settled integer position (0 = settled, 0.5 = midpoint)
  const distFromInt = useTransform(positionMV, (pos) =>
    Math.abs(pos - Math.round(pos))
  );

  // Brackets contract as the active item leaves, expand as the next arrives
  const scale = useTransform(distFromInt, [0, 0.5], [1, 0.84]);

  // Slight opacity pulse reinforces the transition
  const opacity = useTransform(distFromInt, [0, 0.5], [1, 0.55]);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: ACTIVE_WIDTH,
        height: ACTIVE_HEIGHT,
        scale,
        opacity,
      }}
    >
      <Corner position="tl" />
      <Corner position="tr" />
      <Corner position="bl" />
      <Corner position="br" />
    </motion.div>
  );
}
