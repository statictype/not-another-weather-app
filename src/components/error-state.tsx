import { RotateCwIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: (() => void) | undefined;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="bento-tile text-center">
      <div className="flex flex-col items-center gap-6 py-14">
        <div className="rounded-3xl bg-foreground/6 p-7 text-foreground/70">
          <WifiOffIcon className="size-12" aria-hidden="true" strokeWidth={1.75} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-light tracking-tight">{title}</h2>
          <p className="text-foreground/70 mx-auto max-w-md text-balance">{description}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} className="rounded-full px-6">
            <RotateCwIcon className="size-4" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
