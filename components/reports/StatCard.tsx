export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "green" | "red" | "orange" | "blue";
}) {
  const toneClass: Record<string, string> = {
    default: "text-gray-900 dark:text-gray-100",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
    blue: "text-brand",
  };

  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneClass[tone]}`}>{value}</div>
      {sub && (
        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {sub}
        </div>
      )}
    </div>
  );
}
