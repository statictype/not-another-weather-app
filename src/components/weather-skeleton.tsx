import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder shaped like the real weather card so the layout
 * doesn't shift when data lands. Shown only on `isLoading` (first fetch
 * with no prior data) — refetches dim the existing card instead.
 */
export function WeatherSkeleton() {
  return (
    <Card aria-busy="true" aria-label="Loading weather">
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-end gap-4">
          <Skeleton className="h-20 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </CardContent>
    </Card>
  );
}
