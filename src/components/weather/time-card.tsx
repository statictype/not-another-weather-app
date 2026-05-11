import { useEffect, useState } from "react";

interface TimeCardProps {
  tz: string;
}

export function TimeCard({ tz }: TimeCardProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="swap-in swap-d-2 bento-tile flex flex-col justify-center p-6">
      <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-foreground/60">
        Local time
      </p>
      <p className="font-display mt-1 text-4xl leading-none tracking-tight xl:text-3xl 2xl:text-4xl">
        {formatTime(tz)}
      </p>
      <p className="font-display mt-1.5 text-sm font-light text-foreground/45">
        {formatDate(tz)}
      </p>
    </section>
  );
}

function formatTime(tz: string): string {
  try {
    return new Date()
      .toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  } catch {
    return "—";
  }
}

function formatDate(tz: string): string {
  try {
    return new Date().toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
