export function EmptyStateNote({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <p
      className={`rounded-2xl border border-border bg-surface px-6 text-center text-sm text-muted ${
        compact ? "py-6" : "py-10"
      }`}
    >
      {children}
    </p>
  );
}
