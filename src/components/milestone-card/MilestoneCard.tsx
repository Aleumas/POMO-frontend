"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./milestone-card.module.css";
import { type CardRarity, rarityAccentColor } from "./rarities";

interface MilestoneCardProps {
  title: string;
  subtitle?: string;
  art: string;
  rarity: CardRarity;
  className?: string;
  /** Hero graphic shown large in the card's main area, tinted to the rarity color. */
  icon?: ReactNode;
  /** Not-yet-earned state: card desaturates and the graphic blurs, title/subtitle stay visible. */
  locked?: boolean;
  /** Optional action rendered in the card's footer, e.g. a Share button. */
  footer?: ReactNode;
}

/**
 * CSS 3D tilt card using the mouse-tracking technique from
 * https://github.com/frontendfyi/css-3d-card-perspective-animation
 * (bounding rect cached on pointer-enter, rotation computed from
 * cursor percentage, applied via CSS custom properties read by a
 * hover transform).
 *
 * Every card shares the same base color/border; rarity is only
 * signaled by the title's font color and the small graphic mark --
 * no separate badge.
 */
export function MilestoneCard({
  title,
  subtitle,
  art,
  rarity,
  className,
  icon,
  locked,
  footer,
}: MilestoneCardProps) {
  const boundingRef = useRef<DOMRect | null>(null);

  return (
    <div className={cn(styles.wrapper, className)}>
      <div
        className={styles.tilt}
        onMouseEnter={(ev) => {
          boundingRef.current = ev.currentTarget.getBoundingClientRect();
        }}
        onMouseLeave={() => {
          boundingRef.current = null;
        }}
        onMouseMove={(ev) => {
          if (!boundingRef.current) return;
          const x = ev.clientX - boundingRef.current.left;
          const y = ev.clientY - boundingRef.current.top;
          const xPercentage = x / boundingRef.current.width;
          const yPercentage = y / boundingRef.current.height;
          const xRotation = (xPercentage - 0.5) * 20;
          const yRotation = (0.5 - yPercentage) * 20;

          ev.currentTarget.style.setProperty("--x-rotation", `${yRotation}deg`);
          ev.currentTarget.style.setProperty("--y-rotation", `${xRotation}deg`);
          ev.currentTarget.style.setProperty("--x", `${xPercentage * 100}%`);
          ev.currentTarget.style.setProperty("--y", `${yPercentage * 100}%`);
        }}
      >
        <div
          className={cn(styles.card, locked && styles.locked)}
          style={{ "--accent": rarityAccentColor[rarity] } as React.CSSProperties}
        >
          <div className={styles.figure}>
            {art && (
              <div
                className={styles.art}
                style={{ backgroundImage: `url(${art})` }}
              />
            )}
            {icon && (
              <span
                className={styles.heroIcon}
                style={{ color: rarityAccentColor[rarity] }}
              >
                {icon}
              </span>
            )}
          </div>
          <div className={styles.glare} />
          <div className={styles.content}>
            <h3
              className="text-xl font-bold leading-tight"
              style={{ color: rarityAccentColor[rarity] }}
            >
              {title}
            </h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            {footer && <div className={styles.footer}>{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
