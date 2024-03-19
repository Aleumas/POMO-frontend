import { Slider } from "@/components/ui/slider";
import { useState } from "react";

export default ({
  value,
  color,
  onChange,
}: {
  value: number;
  color: string;
  onChange: (value: number) => void;
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  return (
    <>
      <div className="flex w-full flex-col items-center gap-2">
        <div className="flex w-full gap-2 rounded-md border-4 p-4">
          <Slider
            defaultValue={[25]}
            max={95}
            min={5}
            step={5}
            value={[currentValue]}
            color={color}
            onValueChange={(value) => {
              setCurrentValue(value[0]);
            }}
            onValueCommit={(value) => {
              onChange(value[0]);
            }}
          />
          <h2 className="w-16 rounded-md border-2 p-2 text-center">
            {currentValue}
          </h2>
        </div>
      </div>
    </>
  );
};
