import { motion, useIsPresent } from "motion/react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, use } from "react";
import logoNightUrl from "@/assets/logo-night.webp";
import logoUrl from "@/assets/logo.webp";
import {
  BAR_FADE_IN,
  BAR_FADE_OUT,
  PANEL_FADE_IN,
  PANEL_FADE_OUT,
  REDUCED_MOTION_FADE,
} from "@/lib/motion/constants";
import { barLayer, markSlot, panelLayer, panelSafeArea } from "./contract";
import { NavGeometryContext } from "./nav-geometry";

interface LayerProps {
  children: ReactNode;
  className?: string;
  onPointerDown?: ((event: ReactPointerEvent<HTMLElement>) => void) | undefined;
}

export function BarLayer({ children, className }: LayerProps) {
  const { placement, containerIsPanel, reduced, transition } = use(NavGeometryContext);
  const isPresent = useIsPresent();
  return (
    <motion.div
      layout={reduced ? false : "position"}
      transition={transition}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: reduced ? REDUCED_MOTION_FADE : BAR_FADE_IN }}
      exit={{ opacity: 0, transition: reduced ? REDUCED_MOTION_FADE : BAR_FADE_OUT }}
      inert={!isPresent}
      style={{ position: "absolute", ...barLayer(placement, containerIsPanel) }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PanelLayer({ children, className, onPointerDown }: LayerProps) {
  const { placement, containerIsPanel, reduced, transition } = use(NavGeometryContext);
  const isPresent = useIsPresent();
  return (
    <motion.div
      layout={reduced ? false : "position"}
      transition={transition}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: reduced ? REDUCED_MOTION_FADE : PANEL_FADE_IN }}
      exit={{ opacity: 0, transition: reduced ? REDUCED_MOTION_FADE : PANEL_FADE_OUT }}
      inert={!isPresent}
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        ...panelLayer(placement, containerIsPanel),
        ...panelSafeArea(placement),
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stays mounted while open so the page keeps its `<h1>`, but fades out: the
 *  field takes the space. `pointerEvents: none` so the invisible box does not
 *  swallow clicks on the field, or drags that start on the mark. */
export function NavMark({ isOpen }: { isOpen: boolean }) {
  const { placement, reduced, transition } = use(NavGeometryContext);
  const fade = isOpen ? BAR_FADE_OUT : BAR_FADE_IN;
  return (
    <motion.h1
      layout={!reduced}
      transition={transition}
      animate={{
        opacity: isOpen ? 0 : 1,
        transition: reduced ? REDUCED_MOTION_FADE : fade,
      }}
      style={{ position: "absolute", pointerEvents: "none", ...markSlot(placement, isOpen) }}
      className="leading-none select-none"
      aria-label="air"
    >
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="nav-mark-day absolute inset-0 size-full object-cover"
      />
      <img
        src={logoNightUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="nav-mark-night absolute inset-0 size-full object-cover"
      />
    </motion.h1>
  );
}
