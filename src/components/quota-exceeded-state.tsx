import { GaugeIcon } from "lucide-react";

export function QuotaExceededState() {
  return (
    <div className="bento-tile text-center">
      <div className="flex flex-col items-center gap-6 py-14">
        <div className="rounded-3xl bg-foreground/6 p-7 text-foreground/70">
          <GaugeIcon className="size-12" aria-hidden="true" strokeWidth={1.75} />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-light tracking-tight">Free tier exhausted</h2>
          <p className="text-foreground/70 text-balance">
            The free weather API quota for this demo has been used up for the month. It resets on
            the 1st.
          </p>
          <p className="text-foreground/70 text-balance text-sm">
            Want to keep poking around? Clone the repo, grab a free API key from{" "}
            <a
              href="https://www.weatherapi.com/signup.aspx"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 hover:text-foreground"
            >
              weatherapi.com
            </a>
            , and drop it into <code className="font-mono text-xs">.dev.vars</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
