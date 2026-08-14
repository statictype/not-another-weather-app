import { RotateCwIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: (() => void) | undefined;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="card-surface flex flex-col items-center gap-6 rounded-[2rem] px-6 py-20 text-center">
      <div className="rounded-3xl bg-gradient-to-br from-rose-300 to-rose-500 p-7 text-white shadow-[0_20px_40px_-15px_rgba(244,114,114,0.55)]">
        <WifiOffIcon className="size-12" aria-hidden="true" strokeWidth={2} />
      </div>
      <div className="space-y-2">
        <h2 className="font-light text-3xl tracking-tight">{title}</h2>
        <p className="text-foreground/70 mx-auto max-w-md text-balance">{description}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} className="rounded-full bg-sky-700 px-6 hover:bg-sky-800">
          <RotateCwIcon className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
