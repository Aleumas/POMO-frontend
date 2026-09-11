"use client";

// Ported from PaperSwordFish's FishLogo.tsx (private repo, Aleumas/PaperSwordFish),
// swapped from react-spring to framer-motion since that's already a dependency here.
// Tilts toward the cursor and jitters like a loose sticker being nudged on hover.

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";

interface StickerProps {
  /** Single image, e.g. an icon or die-cut badge. */
  src?: string;
  /**
   * Stacked layers rendered bottom-to-top (e.g. base / shadow / light / sharpen),
   * for the aging/quality effect PaperSwordFish used per achievement tier.
   */
  layers?: string[];
  alt: string;
  size?: number;
  className?: string;
}

const WOBBLE_KEYFRAMES = [
  { x: 1, y: 1, rotate: 0 },
  { x: -1, y: -2, rotate: -1 },
  { x: -3, y: 0, rotate: 1 },
  { x: 3, y: 2, rotate: 0 },
  { x: 1, y: -1, rotate: 1 },
  { x: -1, y: 2, rotate: -1 },
  { x: -3, y: 1, rotate: 0 },
  { x: 3, y: 1, rotate: -1 },
  { x: 0, y: 0, rotate: 0 },
];

export function Sticker({ src, layers, alt, size = 96, className }: StickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const tiltX = useSpring(rotateX, { stiffness: 300, damping: 20 });
  const tiltY = useSpring(rotateY, { stiffness: 300, damping: 20 });

  const images = layers?.length ? layers : src ? [src] : [];

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;
    rotateY.set(offsetX / 8);
    rotateX.set(-offsetY / 8);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size, perspective: 600 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          rotateX: tiltX as MotionValue<number>,
          rotateY: tiltY as MotionValue<number>,
        }}
        whileHover={{
          x: WOBBLE_KEYFRAMES.map((k) => k.x),
          y: WOBBLE_KEYFRAMES.map((k) => k.y),
          rotate: WOBBLE_KEYFRAMES.map((k) => k.rotate),
          transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {images.map((layerSrc, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={layerSrc}
            src={layerSrc}
            alt={index === 0 ? alt : ""}
            style={{
              position: index === 0 ? "static" : "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
