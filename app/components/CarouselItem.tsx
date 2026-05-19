"use client";

import { useTransform, MotionValue, motion } from "framer-motion";
import Image from "next/image";
import { Project } from "../data/projects";
import { W_AT, H_AT, BL_AT, OP_AT, Y_AT, ACTIVE_WIDTH, interpolateAt } from "../lib/carouselMath";

interface CarouselItemProps {
  slotIndex: number;
  project: Project;
  positionMV: MotionValue<number>;
  scrollingMV: MotionValue<number>;
  isActive: boolean;
}

export default function CarouselItem({
  slotIndex,
  project,
  positionMV,
  scrollingMV: _scrollingMV,
  isActive,
}: CarouselItemProps) {
  const virtualOffset = useTransform(positionMV, (pos) => slotIndex - pos);

  const width = useTransform(virtualOffset, (off) =>
    interpolateAt(W_AT, Math.abs(off))
  );

  const height = useTransform(virtualOffset, (off) =>
    interpolateAt(H_AT, Math.abs(off))
  );

  const opacity = useTransform(virtualOffset, (off) => {
    const abs = Math.abs(off);
    if (abs > W_AT.length - 0.5) return 0;
    return interpolateAt(OP_AT, abs);
  });

  const filter = useTransform(virtualOffset, (off) => {
    const blur = interpolateAt(BL_AT, Math.abs(off));
    return blur > 0 ? `blur(${blur}px)` : "none";
  });

  const x = useTransform(width, (w) => (ACTIVE_WIDTH - w) / 2);

  const y = useTransform(virtualOffset, (off) => {
    const abs = Math.abs(off);
    const dir = off >= 0 ? 1 : -1;
    const yCenter = interpolateAt(Y_AT, abs) * dir;
    const h = interpolateAt(H_AT, abs);
    return yCenter - h / 2;
  });

  const zIndex = useTransform(virtualOffset, (off) => 10 - Math.floor(Math.abs(off)));

  return (
    <motion.div
      className={`absolute left-0 top-1/2${isActive ? "" : " cursor-pointer"}`}
      style={{ width, height, x, y, opacity, filter, zIndex }}
    >
      <Image
        src={project.image}
        alt={project.title}
        fill
        draggable={false}
        sizes="450px"
        loading="eager"
        className="object-cover pointer-events-none select-none"
      />
    </motion.div>
  );
}
