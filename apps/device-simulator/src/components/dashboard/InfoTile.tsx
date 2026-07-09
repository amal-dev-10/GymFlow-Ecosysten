export function InfoTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-base font-medium text-neutral-100 ${valueClassName || ""}`}>{value}</p>
    </div>
  );
}
