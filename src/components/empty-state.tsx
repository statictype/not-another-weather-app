import { LocateFixedIcon, SearchIcon, ShuffleIcon } from "lucide-react";
import type { CitySelectionIntent } from "@/lib/city-selection";
import { hasVisitedBefore } from "@/lib/first-run";
import { STARTER_CITIES } from "@/lib/random-cities";

interface EmptyStateProps {
  /** Opens the nav panel with the field focused. Without it a first visit with
   *  no `?city=` has no visible typing affordance. */
  onSearchRequest: () => void;
  onSelectCity: (intent: CitySelectionIntent) => Promise<string | null>;
}

export function EmptyState({ onSearchRequest, onSelectCity }: EmptyStateProps) {
  const returning = hasVisitedBefore();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[6vh]">
      <div className="flex flex-col items-center gap-8">
        <h2 className="type-display max-w-lg text-center text-balance">
          {returning ? "Where to next?" : "What's the weather like?"}
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <StartAction icon={SearchIcon} label="Search a city" onSelect={onSearchRequest} />
          <StartAction
            icon={LocateFixedIcon}
            label="Use my location"
            onSelect={() => void onSelectCity({ kind: "location" })}
          />
          <StartAction
            icon={ShuffleIcon}
            label="Surprise me"
            onSelect={() => void onSelectCity({ kind: "random" })}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="label-section">Or start somewhere</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {STARTER_CITIES.map((city) => (
              <li key={city.query}>
                <button
                  type="button"
                  onClick={() => void onSelectCity({ kind: "starter", query: city.query })}
                  className="start-city rounded-full px-3.5 py-1.5 text-sm tracking-tight"
                  aria-label={`Weather in ${city.label}`}
                >
                  {city.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StartAction({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: typeof LocateFixedIcon;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="start-action group flex items-center justify-center gap-3 rounded-[1.75rem] px-5 py-3"
    >
      <Icon
        className="size-5 shrink-0 text-foreground/70 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:group-hover:rotate-180"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}
