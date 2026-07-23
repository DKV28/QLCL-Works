import type { Tag } from "@/lib/types";

export function TagChips({
  tags,
}: {
  tags: Pick<Tag, "id" | "name" | "color">[];
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: t.color }}
        >
          {t.name}
        </span>
      ))}
    </div>
  );
}
