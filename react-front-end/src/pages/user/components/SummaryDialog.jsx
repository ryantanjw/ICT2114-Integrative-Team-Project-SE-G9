import React from "react";
import { IoMdClose } from "react-icons/io";

export default function SummaryDialog({ title, message, processes, entries, onClose }) {
  const CATEGORY_ONLY_RE = /^(physical|chemical|biological|mechanical|electrical)\s*[:\-–—\.]?\s*$/i;

  const renderStructured = (proc) => {
    if (!proc.activities || proc.activities.length === 0) return null;
    return (
      <div className="space-y-2">
        {proc.activities.map((act, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">{act.label}</span>
            </div>
            {act.hazards && act.hazards.length > 0 && (
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {act.hazards
                  .filter(hz => !!hz && !!hz.text && !CATEGORY_ONLY_RE.test(hz.text.trim()))
                  .map((hz, hIdx) => {
                    const chipColor = hz.source === 'DB matched' ? 'bg-green-100 text-green-800' : hz.source === 'AI generated' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
                    return (
                      <li key={hIdx} className="text-gray-700 flex items-center justify-between">
                        <span>{hz.text}</span>
                        {hz.source ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${chipColor}`}>
                            {hz.source === 'DB matched' ? 'DB' : hz.source === 'AI generated' ? 'AI' : hz.source}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };
  // If both are missing or both empty, render nothing
  if ((!processes || processes.length === 0) && (!entries || entries.length === 0)) return null;

  // Parse multi-line activity blocks: first line is
  // "Activity: <name> — <source>", subsequent lines starting with "- " are hazards for that activity.
  const parseBlocks = (aiOrNot) => {
    if (!aiOrNot || typeof aiOrNot !== 'string') return [];

    const blocks = aiOrNot
      .split(/\n\s*\n/) // double newline separates activities
      .map(b => b.trim())
      .filter(Boolean);

    return blocks.map((block) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return null;

      // First line contains activity and optional source chip after an em dash
      const first = lines[0];
      let activityText = first;
      let source = '';
      const parts = first.split(' — ');
      if (parts.length > 1) {
        activityText = parts[0];
        source = parts.slice(1).join(' — ');
      }

      // Strip leading "Activity: " if present for display
      activityText = activityText.replace(/^Activity:\s*/i, 'Activity: ');

      const hazards = lines.slice(1)
        .filter(l => /^[-•]/.test(l))
        .map(l => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);

      return { activityText, source, hazards };
    }).filter(Boolean);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col space-y-6">
        {/* Header with title and close icon */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <IoMdClose size={24} />
          </button>
        </div>

        {/* Intro message */}
        {message && <p className="text-gray-700">{message}</p>}

        {/* Unified summary list */}
        <div className="space-y-4">
          {processes
            ? processes.map((proc, index) => (
                <div key={index} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                  <h3 className="font-semibold text-gray-800">{proc.name}</h3>
                  <div className="space-y-2">
                    {proc.activities && proc.activities.length > 0
                      ? renderStructured(proc)
                      : parseBlocks(proc.aiOrNot).map((blk, idx) => {
                          const chipColor =
                            blk.source === 'DB matched' ? 'bg-green-100 text-green-800' :
                            blk.source === 'AI generated' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800';
                          return (
                            <div key={idx} className="">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">{blk.activityText}</span>
                                {blk.source && (
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${chipColor}`}>
                                    {blk.source === 'DB matched' ? 'DB' : blk.source === 'AI generated' ? 'AI' : blk.source}
                                  </span>
                                )}
                              </div>
                              {blk.hazards && blk.hazards.length > 0 && (
                                <ul className="list-disc pl-6 mt-2 space-y-1">
                                  {(() => {
                                    const finalList = blk.hazards
                                      .map(h => (h || '').trim())
                                      .filter(Boolean)
                                      .filter(h => {
                                        const [t] = h.split(' — ');
                                        return !CATEGORY_ONLY_RE.test((t || '').trim());
                                      });

                                    return finalList.map((hz, hIdx) => {
                                      const [hzText, hzSourceRaw] = hz.split(' — ');
                                      const hzSource = hzSourceRaw && hzSourceRaw.trim();
                                      const chipColor =
                                        hzSource === 'DB matched' ? 'bg-green-100 text-green-800' :
                                        hzSource === 'AI generated' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800';
                                      return (
                                        <li key={hIdx} className="text-gray-700 flex items-center justify-between">
                                          <span>{hzText}</span>
                                          {hzSource && (
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${chipColor}`}>
                                              {hzSource === 'DB matched' ? 'DB' : hzSource === 'AI generated' ? 'AI' : hzSource}
                                            </span>
                                          )}
                                        </li>
                                      );
                                    });
                                  })()}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                  </div>
                </div>
              ))
            : entries.map((entry, index) => (
                <div key={index} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                  <p className="text-gray-700 whitespace-pre-wrap">{entry}</p>
                </div>
              ))
          }
        </div>

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-black text-white rounded-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}