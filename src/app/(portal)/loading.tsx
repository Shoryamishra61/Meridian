export default function PortalLoading() {
  return (
    <div className="space-y-5">
      <div className="border-b border-[var(--border)] pb-5">
        <div className="skeleton mb-2 h-3 w-28" />
        <div className="skeleton mb-2 h-7 w-64" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface p-4">
            <div className="skeleton mb-3 h-3 w-20" />
            <div className="skeleton h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="surface p-4">
        <div className="skeleton mb-3 h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
