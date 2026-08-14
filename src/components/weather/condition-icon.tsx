import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudMoonIcon,
  CloudMoonRainIcon,
  CloudRainIcon,
  CloudRainWindIcon,
  CloudSnowIcon,
  CloudSunIcon,
  CloudSunRainIcon,
  type LucideIcon,
  MoonStarIcon,
  SunIcon,
} from "lucide-react";
import { type ComponentProps, createElement } from "react";

function pickConditionIcon(text: string, isDay: boolean): LucideIcon {
  const t = text.toLowerCase();
  if (/thunder|lightning/.test(t)) return CloudLightningIcon;
  if (/snow|sleet|blizzard|ice/.test(t)) return CloudSnowIcon;
  if (/fog|mist|haze/.test(t)) return CloudFogIcon;

  const partial = /patchy|nearby|partial/.test(t);
  const rainy = /rain|drizzle|shower/.test(t);

  if (rainy) {
    if (partial) return isDay ? CloudSunRainIcon : CloudMoonRainIcon;
    if (/drizzle|light/.test(t)) return CloudDrizzleIcon;
    if (/heavy|torrential|downpour/.test(t)) return CloudRainWindIcon;
    return CloudRainIcon;
  }

  if (/partly|partial/.test(t)) return isDay ? CloudSunIcon : CloudMoonIcon;
  if (/cloud|overcast/.test(t)) return CloudIcon;
  if (/clear|sun/.test(t)) return isDay ? SunIcon : MoonStarIcon;
  return isDay ? SunIcon : MoonStarIcon;
}

type ConditionIconProps = ComponentProps<LucideIcon> & {
  text: string;
  isDay: boolean;
};

export function ConditionIcon({ text, isDay, ...iconProps }: ConditionIconProps) {
  return createElement(pickConditionIcon(text, isDay), iconProps);
}
