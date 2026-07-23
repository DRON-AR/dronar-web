export function ShellCard({
  label,
  value,
  pending = false,
}: {
  label: string;
  value: string;
  pending?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-aero-700/40 bg-aero-900/60 p-5 backdrop-blur-md">
      <p className="font-mono text-xs uppercase tracking-widest text-mist/50">{label}</p>
      <p className={`mt-2 font-mono text-sm ${pending ? "text-mist/40" : "text-signal"}`}>
        {value}
      </p>
    </div>
  );
}
