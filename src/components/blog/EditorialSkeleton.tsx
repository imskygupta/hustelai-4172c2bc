/**
 * Calm editorial skeletons — subtle shimmer, no spinners.
 * Used while blog feed/post data is being revalidated.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-muted/50 editorial-shimmer ${className}`} />;
}

export function EditorialPostSkeleton() {
  return (
    <>
      <article className="mx-auto max-w-[760px] px-5 pt-10 pb-6">
        <Bar className="h-3 w-40 mb-5" />
        <div className="flex gap-2 mb-3">
          <Bar className="h-3 w-24" />
          <Bar className="h-3 w-20" />
        </div>
        <Bar className="h-10 w-full mb-2" />
        <Bar className="h-10 w-4/5 mb-5" />
        <Bar className="h-5 w-2/3 mb-6" />
        <div className="flex gap-3 border-y border-border/50 py-3">
          <Bar className="h-8 w-8 rounded-full" />
          <Bar className="h-4 w-32" />
          <Bar className="h-4 w-24" />
        </div>
      </article>
      <div className="mx-auto max-w-4xl px-5 mb-12">
        <Bar className="aspect-[16/9] w-full" />
      </div>
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid lg:grid-cols-[minmax(0,720px)_240px] lg:gap-12 lg:justify-center">
          <div className="min-w-0 space-y-3">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-[97%]" />
            <Bar className="h-4 w-[94%]" />
            <Bar className="h-4 w-[60%] mb-6" />
            <Bar className="h-6 w-1/2 mt-8 mb-4" />
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-[92%]" />
            <Bar className="h-4 w-[88%]" />
            <Bar className="h-4 w-[70%]" />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-32 space-y-3">
              <Bar className="h-3 w-24 mb-3" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-[90%]" />
              <Bar className="h-3 w-[80%]" />
              <Bar className="h-3 w-[85%]" />
            </div>
          </aside>
        </div>
      </div>
      <OperationalHint label="Preparing operational notes…" />
    </>
  );
}

export function EditorialFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Bar className="aspect-[16/10] w-full" />
          <Bar className="h-3 w-32" />
          <Bar className="h-5 w-[92%]" />
          <Bar className="h-5 w-[68%]" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-[80%]" />
        </div>
      ))}
    </div>
  );
}

export function EditorialCategorySkeleton() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-5 mb-12">
        <div className="grid md:grid-cols-2 rounded-lg overflow-hidden border border-border/60">
          <Bar className="aspect-[16/10] md:aspect-auto rounded-none" />
          <div className="p-6 md:p-8 space-y-3">
            <Bar className="h-3 w-32" />
            <Bar className="h-7 w-full" />
            <Bar className="h-7 w-3/4" />
            <Bar className="h-4 w-full mt-2" />
            <Bar className="h-4 w-5/6" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 mb-16">
        <EditorialFeedSkeleton count={6} />
      </div>
      <OperationalHint label="Fetching workflow cluster…" />
    </>
  );
}

export function OperationalHint({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-6xl px-5 -mt-4 mb-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {label}
    </div>
  );
}