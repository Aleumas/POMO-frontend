"use client";

export default ({
  value,
  onChange,
  presets,
  variant,
}: {
  value: number;
  onChange: (value: number) => void;
  presets: number[];
  variant: "work" | "break";
}) => {
  const selectedClasses =
    variant === "work"
      ? "bg-accent-work text-white"
      : "bg-accent-break text-white";
  const unselectedClasses =
    variant === "work"
      ? "bg-accent-work-tint text-accent-work hover:bg-accent-work/15"
      : "bg-accent-break-tint text-accent-break hover:bg-accent-break/15";

  return (
    <div className="flex w-full items-center gap-2">
      {presets.map((preset) => (
        <button
          key={preset}
          onClick={() => onChange(preset)}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            preset === value ? selectedClasses : unselectedClasses
          }`}
        >
          {preset} min
        </button>
      ))}
    </div>
  );
};
