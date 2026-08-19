import type { Transition } from "motion/react";
import { createContext } from "react";
import { REDUCED_MOTION_FADE } from "@/lib/motion/constants";
import type { NavPlacement } from "./contract";

interface NavGeometry {
  placement: NavPlacement;
  /** Which of the two geometries the container is holding this frame. */
  containerIsPanel: boolean;
  reduced: boolean;
  transition: Transition;
}

/**
 * The layers read their box from context rather than from props because
 * `AnimatePresence` renders an exiting child from the render it was removed
 * on. A frozen prop would leave the outgoing layer measured against a geometry
 * the container has already left; a context update reaches it either way.
 */
export const NavGeometryContext = createContext<NavGeometry>({
  placement: { edge: "bottom", panel: "fullscreen", drag: "down" },
  containerIsPanel: false,
  reduced: false,
  transition: REDUCED_MOTION_FADE,
});
