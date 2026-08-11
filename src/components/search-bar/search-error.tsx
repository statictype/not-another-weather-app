import { SearchXIcon } from "lucide-react";

interface SearchErrorProps {
  id: string;
  message: string | null;
}

export function SearchError({ id, message }: SearchErrorProps) {
  return (
    <div id={id} role="alert" className={message ? "mt-2.5" : undefined}>
      {message && (
        <p className="bg-destructive/8 text-foreground flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm">
          <SearchXIcon
            className="text-destructive size-4 shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
          {message}
        </p>
      )}
    </div>
  );
}
