type StatTileProps = {
  icon: React.ReactNode;
  value: string;
  label: string;
};

export function StatTile({ icon, value, label }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col gap-3.5 rounded-2xl border border-border p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-tint text-accent">
        {icon}
      </div>
      <div>
        <p className="font-heading text-2xl font-semibold">{value}</p>
        <p className="mt-1 text-[13px] text-muted">{label}</p>
      </div>
    </div>
  );
}
