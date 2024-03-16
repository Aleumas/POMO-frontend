import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus } from "lucide-react";

export default ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => {
  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <p className="text-md">{label}</p>
        <div className="flex flex-row items-center gap-5">
          <Button
            onClick={() => {
              onChange(value - 1);
            }}
            variant="outline"
            size="icon"
            disabled={value <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            value={value}
            onChange={(e) => {
              if (value > 0 && value < 100) {
                onChange(handleInput(e.target.value, value));
              }
            }}
          />
          <Button
            onClick={() => {
              onChange(value + 1);
            }}
            variant="outline"
            size="icon"
            disabled={value >= 100}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

const handleInput = (newValue: string, oldValue: number): number => {
  if (newValue === "") {
    return 1;
  }
  return parseInt(newValue) ?? oldValue;
};
