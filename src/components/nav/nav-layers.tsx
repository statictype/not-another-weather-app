import { motion, useIsPresent } from "motion/react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, use } from "react";
import { BAR_FADE_IN, BAR_FADE_OUT, REDUCED_MOTION_FADE } from "@/lib/motion/constants";
import { barLayer, LOGO_BOX, markSlot, panelLayer, panelSafeArea } from "./contract";
import { NavGeometryContext } from "./nav-geometry";

/** A layer stops taking clicks and leaves the accessibility tree the moment it
 *  starts leaving, so a control at 10% opacity is not still hittable. Read from
 *  presence rather than from the container's state, which only correlates. */
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
      animate={{ opacity: 1, transition: reduced ? REDUCED_MOTION_FADE : { duration: 0.16 } }}
      exit={{ opacity: 0, transition: reduced ? REDUCED_MOTION_FADE : { duration: 0.14 } }}
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

/** One node across both states, so the page never holds two `<h1>`s and the
 *  mark is the one object visibly carried from the bar into the panel. */
export function NavMark({ isOpen }: { isOpen: boolean }) {
  const { placement, reduced, transition } = use(NavGeometryContext);
  return (
    <motion.h1
      layout={reduced ? false : "position"}
      transition={transition}
      style={{
        position: "absolute",
        width: LOGO_BOX,
        height: LOGO_BOX,
        ...markSlot(placement, isOpen),
      }}
      className="flex items-center justify-center leading-none select-none"
      aria-label="Weather"
    >
      <span aria-hidden="true" className="text-2xl">
        😶‍🌫️
      </span>
    </motion.h1>
  );
}
