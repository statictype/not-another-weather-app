import { useEffect, useState } from "react";

interface TimeCardProps {
  tz: string;
}

export function TimeCard({ tz }: TimeCardProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="swap-in swap-d-4 bento-tile flex flex-col justify-center p-6 sm:col-span-12 xl:order-2 xl:col-span-4">
      <p className="label-section">Local time</p>
      <p className="mt-4 text-4xl leading-none tracking-tight xl:text-3xl 2xl:text-4xl">
        {formatTime(now, tz)}
      </p>
      <p className="mt-1.5 text-sm font-light text-foreground/70">{formatDate(now, tz)}</p>
    </section>
  );
}

function formatTime(now: number, tz: string): string {
  try {
    return new Date(now)
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

function formatDate(now: number, tz: string): string {
  try {
    return new Date(now).toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
