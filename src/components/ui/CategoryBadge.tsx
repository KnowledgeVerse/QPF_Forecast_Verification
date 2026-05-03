import type { Category } from "@/types";

const categoryStyles: Record<Category, { bg: string; text: string }> = {
  DRY: { bg: "#ffffff", text: "#000000" },
  ISOL: { bg: "#33cc33", text: "#ffffff" },
  SCT: { bg: "#009900", text: "#ffffff" },
  FWS: { bg: "#33ccff", text: "#000000" },
  WS: { bg: "#0066ff", text: "#ffffff" },
};

interface CategoryBadgeProps {
  category: Category | string;
  size?: "sm" | "md";
}

export default function CategoryBadge({
  category,
  size = "md",
}: CategoryBadgeProps) {
  const style = categoryStyles[category as Category] || categoryStyles.DRY;
  const padding =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-block rounded-md font-semibold ${padding}`}
      style={{ background: style.bg, color: style.text }}
    >
      {category}
    </span>
  );
}
