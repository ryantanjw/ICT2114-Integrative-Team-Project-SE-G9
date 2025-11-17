import React from "react";

export default function TableInfo({
  title,
  items = [],
  limit = 5,
  activeIndices = [],
  selectedIndex = -1,
  onSelect,
  position = 4,
  useActiveTone = false,
  emptyText = "No items",
}) {
  const isActive = (idx) => activeIndices.includes(idx);
  const isSelected = (idx) => idx === selectedIndex;

  const containerClass = (() => {
    switch (position) {
      case 1:
        // <xl: full rounded; xl+: left-rounded, no right border
        return "border border-gray-200 rounded-lg xl:rounded-none xl:rounded-l-lg xl:border-r-0";
      case 2:
        // <xl: full rounded; xl+: no rounding (middle), full vertical borders
        return "border border-gray-200 rounded-lg xl:rounded-none xl:border-t xl:border-b xl:border-l xl:border-r";
      case 3:
        // <xl: full rounded; xl+: right-rounded, no left border
        return "border border-gray-200 rounded-lg xl:rounded-none xl:rounded-r-lg";
      default:
        // Normal card
        return "border border-gray-200 rounded-lg";
    }
  })();

  return (
    <div className="w-full">
      {title && (
        <div className="mb-2 mt-5 text-base font-semibold text-gray-800">{title}</div>
      )}

      <div className={`${containerClass} overflow-hidden bg-white`}>
        {/* Body rows (scrollable) */}
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: limit ? `${limit * 56}px` : undefined,
            minHeight: limit ? `${limit * 56}px` : undefined,
          }}
        >
          {items.length > 0 ? (
            items.map((label, idx) => {
              const base = "w-full text-left px-4 border-t first:border-t-0 border-gray-200 transition-colors flex flex-col items-start justify-center gap-2 py-3 min-h-[56px]";
              const tone = isSelected(idx)
                ? "text-gray-900"
                : useActiveTone && isActive(idx)
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600";
              const selected = isSelected(idx) ? " bg-gray-100 font-semibold" : "";
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => onSelect?.(idx)}
                  className={`${base} ${tone} ${selected} truncate`}
                >
                  {label}
                </button>
              );
            })
          ) : (
            <div className="w-full text-left px-4 border-t first:border-t-0 border-gray-200 py-3 min-h-[56px] flex items-center text-gray-400 select-none">
              {emptyText}
            </div>
          )}
          {Array.from({ length: Math.max(0, (limit ?? 0) - Math.max(1, items.length)) }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className={
                "w-full text-left px-4 border-t first:border-t-0 border-gray-200 py-3 min-h-[56px] flex items-center text-transparent select-none"
              }
            >
              {"\u00A0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}