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

/** A spring given as the time it takes to come to rest plus how far it passes
 *  its target on the way. Motion solves stiffness and damping from the pair. */
export interface TimedSpring {
  type: "spring";
  duration: number;
  bounce: number;
}

/** Bar → panel.
 *
 *  Was `stiffness: 360, damping: 38, mass: 1` — a damping ratio of 1.0014, so
 *  critically damped. That profile covers 56% of the travel in the first 100ms
 *  and needs another 320ms for the last 2%: a phone-width open moves 440 of its
 *  786px before the eye can track it, then creeps. Reads as a snap.
 *
 *  Stated as a settling time instead, the same travel is 46% done at 100ms and
 *  at rest by 650ms. `bounce` 0.2 passes the target by 12px at phone width,
 *  which is what reads as settling rather than stopping. */
export const EXPAND_SPRING: TimedSpring = {
  type: "spring",
  duration: 0.62,
  bounce: 0.2,
};

/** Panel → bar. Shorter than the expand so a close reads as decisive, and no
 *  bounce: the box is landing back into the bar it has to line up with. */
export const COLLAPSE_SPRING: TimedSpring = {
  type: "spring",
  duration: 0.34,
  bounce: 0,
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

/** The panel's regions, in reading order: `NavPanel` renders two, the field and
 *  the menu, so the added delay tops out at one `PANEL_STAGGER`.
 *
 *  The container's background is opaque from the first frame, so any delay here
 *  is time the viewer spends looking at a blank sheet. At phone width the box
 *  is 90% grown by 0.2s; the delay was 0.06 and the regions ran 0.3s, which
 *  left about 0.25s of empty surface. The last region now lands at
 *  0.02 + 0.03 + 0.2 = 0.25s, with the box rather than behind it. */
export const PANEL_REGION_DELAY = 0.02;
export const PANEL_STAGGER = 0.03;
export const PANEL_REGION_IN = {
  duration: 0.2,
  ease: [0.33, 1, 0.68, 1],
} as const;
/** Pixels a region travels along the growth axis on the way in. */
export const PANEL_REGION_OFFSET = 10;

/** The panel surface itself. Short: it gates every region behind it, and the
 *  sheet it sits on is already opaque. */
export const PANEL_FADE_IN = { duration: 0.12 } as const;
export const PANEL_FADE_OUT = { duration: 0.14 } as const;

/** Past either of these on release, the dismiss drag closes the panel. */
export const DISMISS_DISTANCE_PX = 96;
export const DISMISS_VELOCITY_PX_PER_S = 500;
