"use client";

import { RoomView } from "@/lib/room-view";

const OPTIONS: { value: RoomView; label: string }[] = [
  { value: "focus", label: "Focus" },
  { value: "gallery", label: "Gallery" },
];

export default ({
  value,
  onChange,
}: {
  value: RoomView;
  onChange: (view: RoomView) => void;
}) => {
  return (
    <div className="bg-ink/5 inline-flex items-center gap-1 rounded-full p-1">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active
                ? "bg-accent-work text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
