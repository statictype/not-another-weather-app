/**
 * Springs and durations for the nav bar ↔ panel transition.
 *
 * Replaces the four inline configs that lived in `search-bar.tsx` and
 * `menu.tsx`. Values are the starting point, not a contract — the geometry in
 * `components/nav/contract.ts` is what tests assert.
 */

export interface Spring {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
}

/** Bar → panel. Critically damped: the box travels a long way and an overshoot
 *  on a full-viewport surface reads as a wobble. */
export const EXPAND_SPRING: Spring = {
  type: "spring",
  stiffness: 360,
  damping: 38,
  mass: 1,
};

/** Panel → bar. Stiffer than the expand so a close reads as decisive. */
export const COLLAPSE_SPRING: Spring = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.85,
};

/** Applied when a dismiss drag is released short of the threshold. */
export const DRAG_RELEASE_SPRING: Spring = {
  type: "spring",
  stiffness: 480,
  damping: 42,
};

/** `dragTransition` takes its springback stiffness and damping under these
 *  names rather than as a `Spring`. */
export const DISMISS_BOUNCE = {
  bounceStiffness: DRAG_RELEASE_SPRING.stiffness,
  bounceDamping: DRAG_RELEASE_SPRING.damping,
};

/** The focus pill that slides between menu rows. */
export const PILL_SPRING: Spring = {
  type: "spring",
  stiffness: 480,
  damping: 36,
  mass: 0.7,
};

/** Seconds. The whole of the reduced-motion path — crossfade, no movement. */
export const REDUCED_MOTION_FADE = { duration: 0.15 };

/** Scrim fade, both directions. Seconds. */
export const SCRIM_FADE = { duration: 0.22 };

/** The bar's triggers leave before the panel's regions arrive, so the two never
 *  read as one pile of controls. Seconds. */
export const BAR_FADE_OUT = { duration: 0.09, ease: "linear" } as const;
export const BAR_FADE_IN = { duration: 0.18, delay: 0.1 } as const;

/** The panel's three regions, in reading order. Total added delay is capped at
 *  `PANEL_STAGGER * 2` — three children, not a list of unknown length. */
export const PANEL_REGION_DELAY = 0.06;
export const PANEL_STAGGER = 0.045;
export const PANEL_REGION_IN = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
} as const;
/** Pixels a region travels along the growth axis on the way in. */
export const PANEL_REGION_OFFSET = 10;

/** Past either of these on release, the dismiss drag closes the panel. */
export const DISMISS_DISTANCE_PX = 96;
export const DISMISS_VELOCITY_PX_PER_S = 500;
