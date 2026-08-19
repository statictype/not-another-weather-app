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

/** Bar → panel. */
export const EXPAND_SPRING: Spring = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** Panel → bar. Stiffer than the expand so a close reads as decisive. */
export const COLLAPSE_SPRING: Spring = {
  type: "spring",
  stiffness: 500,
  damping: 40,
};

/** Applied when a dismiss drag is released short of the threshold. */
export const DRAG_RELEASE_SPRING: Spring = {
  type: "spring",
  stiffness: 480,
  damping: 42,
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
export const SCRIM_FADE = { duration: 0.2 };

/** Past either of these on release, the dismiss drag closes the panel. */
export const DISMISS_DISTANCE_PX = 96;
export const DISMISS_VELOCITY_PX_PER_S = 500;
