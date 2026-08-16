export function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 sm:min-h-[50vh]">
      <div className="flex flex-col items-center gap-8">
        <h2 className="type-display max-w-lg text-center text-balance">What's the weather like?</h2>

        <p className="label-section">Search a city to find out</p>
      </div>
    </div>
  );
}
