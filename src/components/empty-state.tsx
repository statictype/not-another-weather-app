export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 sm:min-h-[50vh]">
      <div className="flex flex-col items-center gap-8">
        <h2 className="text-foreground/85 max-w-lg text-center text-4xl leading-[1.05] font-extralight tracking-tight sm:text-6xl lg:text-7xl">
          What's the weather like?
        </h2>

        <p className="label-section">Search a city to find out</p>
      </div>
    </div>
  );
}
