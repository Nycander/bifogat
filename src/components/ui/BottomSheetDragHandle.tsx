import React from "react";

export const BottomSheetDragHandle: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      className={`sheet-drag-handle-container ${className}`.trim()}
      aria-hidden="true"
    >
      <div className="sheet-drag-handle" />
    </div>
  );
};
