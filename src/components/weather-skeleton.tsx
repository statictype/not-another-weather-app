export function WeatherSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading weather"
      className="grid w-full auto-rows-[minmax(150px,auto)] grid-cols-1 gap-5 sm:grid-cols-4 sm:gap-6 md:grid-cols-8 xl:grid-cols-4"
    >
      <div className="bento-tile min-h-[334px] sm:col-span-4 md:col-span-8 xl:col-span-3">
        <Bar className="h-[18px] w-24" />
      </div>
      <div className="flex flex-col gap-5 sm:col-span-4 sm:gap-6 md:col-span-3 md:row-span-2 xl:col-span-1 xl:row-span-1">
        <div className="bento-tile flex-1">
          <Bar className="h-[18px] w-16" />
        </div>
      </div>
      <Tile className="sm:col-span-4 md:col-span-5 xl:col-span-2" />
      <Tile className="sm:col-span-4 md:col-span-5 xl:col-span-2" />
      <Tile className="sm:col-span-4 md:col-span-4 xl:col-span-1" />
      <Tile className="sm:col-span-4 md:col-span-4 xl:col-span-1" />
      <Tile className="sm:col-span-4 md:col-span-4 xl:col-span-1" />
      <Tile className="sm:col-span-4 md:col-span-4 xl:col-span-1" />
    </div>
  );
}

function Tile({ className }: { className: string }) {
  return (
    <div className={`bento-tile ${className}`}>
      <Bar className="h-[18px] w-20" />
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded bg-foreground/10 ${className}`} />
  );
}
