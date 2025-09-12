import React, { useMemo } from "react";

export default function TextField({
  header,
  value,
  onChange,
  placeholder = "",
  rows = 6,
  name,
  id,
  disabled = false,
  readOnly = false,
  fill = false,
  // deprecated but supported
  text,
}) {
  // Prefer controlled `value`; otherwise fall back to legacy `text` as default
  const defaultVal = useMemo(() => (value !== undefined ? value : (text ?? "")), [value, text]);

  // Compute minHeight based on rows (default 6), lineHeight ~24px (1.5 * 16)
  const effectiveRows = rows || 6;
  const minHeight = `${effectiveRows * 24}px`;
  const commonProps = {
    name,
    id,
    rows,
    placeholder,
    disabled,
    readOnly,
    className:
      "w-full rounded-lg border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none overflow-auto" +
      (fill ? " h-full flex-1" : ""),
    style: { minHeight },
  };

  return (
    <div className={`w-full ${fill ? "h-full flex flex-col" : ""}`}>
      {header && (
        <div className="mb-2 text-base font-semibold text-gray-800">{header}</div>
      )}

      {onChange !== undefined ? (
        // Controlled mode
        <textarea
          {...commonProps}
          value={defaultVal}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        // Uncontrolled (falls back to legacy behavior but editable)
        <textarea
          {...commonProps}
          defaultValue={defaultVal}
        />
      )}
    </div>
  );
}