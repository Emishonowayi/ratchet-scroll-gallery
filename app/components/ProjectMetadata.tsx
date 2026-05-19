"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Project } from "../data/projects";

interface ProjectMetadataProps {
  project: Project;
  side: "left" | "right";
}

const textVariants = {
  enter: { opacity: 0, y: 6 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const transition = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export default function ProjectMetadata({ project, side }: ProjectMetadataProps) {
  const isLeft = side === "left";

  return (
    <div
      className={`flex flex-col gap-4 flex-1 min-w-0 ${
        isLeft ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${side}-${project.id}`}
          className={`flex flex-col gap-2 w-full ${isLeft ? "items-end" : "items-start"}`}
          variants={textVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          {isLeft ? (
            <>
              {/* Index — dimmed, tight */}
              <p className="font-mono text-[14px] font-normal leading-[1.5] text-black uppercase opacity-50 whitespace-nowrap">
                {project.index}
              </p>
              {/* Title — full weight */}
              <p className="font-mono text-[14px] font-normal leading-[1.4] text-black uppercase">
                {project.title}
              </p>
            </>
          ) : (
            <>
              {/* Year — dimmed, tight */}
              <p className="font-mono text-[14px] font-normal leading-[1.5] text-black uppercase opacity-50 whitespace-nowrap">
                {project.year}
              </p>
              {/* Category — full weight */}
              <p className="font-mono text-[14px] font-normal leading-[1.4] text-black uppercase">
                {project.category}
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
