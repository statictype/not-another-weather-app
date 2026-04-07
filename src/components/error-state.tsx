import { RotateCwIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: (() => void) | undefined;
}

/**
 * Generic system-error takeover. Used for `network` and `upstream`
 * kinds — situations where the proxy or its dependencies are unhealthy
 * and the user's input has nothing to do with the failure.
 *
 * Includes a retry button by default; the parent decides whether to
 * pass `onRetry` based on whether retrying is meaningful right now.
 */
export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <WifiOffIcon className="size-8 text-destructive" aria-hidden="true" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl tracking-tight">{title}</h2>
          <p className="text-muted-foreground max-w-sm text-balance">{description}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RotateCwIcon className="size-4" aria-hidden="true" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
