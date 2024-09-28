import React from "react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onValueChange: (color: string) => void;
  label?: string;
}

const famousColors = [
  { name: "Spotify Black", hex: "#191414" },
  { name: "Facebook Blue", hex: "#1877F2" },
  { name: "Twitter Blue", hex: "#1DA1F2" },
  { name: "LinkedIn Blue", hex: "#0A66C2" },
  { name: "Instagram Purple", hex: "#C13584" },
  { name: "YouTube Red", hex: "#FF0000" },
  { name: "Snapchat Yellow", hex: "#FFFC00" },
  { name: "Apple White", hex: "#FFFFFF" },
];

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onValueChange,
  label,
}) => {
  return (
    <div className="mt-4">
      {label && <p className="mb-2 text-sm text-natural-600">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {famousColors.map((color) => (
          <button
            key={color.name}
            className={cn(
              "h-10 w-10 rounded-sm duration-100",
              value === color.hex ? "scale-90 ring-2 ring-offset-2" : ""
            )}
            // @ts-ignore
            style={{ backgroundColor: color.hex, "--tw-ring-color": color.hex }}
            onClick={() => onValueChange(color.hex)}
            title={`${color.name} (${color.hex})`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;
