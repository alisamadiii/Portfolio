import React from "react";

interface ColorPickerProps {
  onValueChange: (color: string) => void;
}

const famousColors = [
  { name: "Facebook Blue", hex: "#003f5c" },
  { name: "Tiffany Blue", hex: "#58508d" },
  { name: "Starbucks Green", hex: "#8a508f" },
  { name: "Coca-Cola Red", hex: "#bc5090" },
  { name: "Twitter Blue", hex: "#de5a79" },
  { name: "McDonald's Yellow", hex: "#ff6361" },
  { name: "Netflix Red", hex: "#ff8531" },
  { name: "Snapchat Yellow", hex: "#ffa600" },
];

const ColorPicker: React.FC<ColorPickerProps> = ({ onValueChange }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {famousColors.map((color) => (
        <button
          key={color.name}
          className="h-10 w-10 rounded-sm active:scale-95"
          style={{ backgroundColor: color.hex }}
          onClick={() => onValueChange(color.hex)}
          title={`${color.name} (${color.hex})`}
        />
      ))}
    </div>
  );
};

export default ColorPicker;
