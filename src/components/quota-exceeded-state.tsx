import { GaugeIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dedicated state for the most interesting failure: the demo's free
 * weather API quota is exhausted.
 *
 * Treated specially because:
 *  - It's a global state (every fetch will fail until the quota resets).
 *  - It explains *why* the app is degraded in a portfolio context.
 *  - It's an opportunity to show the reader how to run with their own key.
 */
export function QuotaExceededState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
        <div className="rounded-full bg-accent/15 p-4">
          <GaugeIcon className="size-8 text-accent" aria-hidden="true" strokeWidth={1.5} />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl tracking-tight">Free tier exhausted</h2>
          <p className="text-muted-foreground text-balance">
            The free weather API quota for this demo has been used up for the month. It resets on
            the 1st.
          </p>
          <p className="text-muted-foreground text-balance text-sm">
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
      </CardContent>
    </Card>
  );
}
