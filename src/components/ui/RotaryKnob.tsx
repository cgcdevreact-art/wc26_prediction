"use client";

import React, { useState, useEffect, useRef } from 'react';

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  label?: string;
  formatValue?: (val: number) => string;
  size?: number;
  color?: string;
  step?: number;
}

export function RotaryKnob({
  value,
  min,
  max,
  onChange,
  label,
  formatValue = (v) => v.toString(),
  size = 64,
  color = "#a855f7",
  step = 1
}: RotaryKnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const startValue = useRef(value);

  const range = max - min;
  const percentage = (value - min) / range;
  
  // Angle for the knob indicator line (-135 to 135 degrees)
  const angle = percentage * 270 - 135;

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Dragging up (negative delta Y) increases the value
      const deltaY = dragStartY.current - e.clientY; 
      // 150 pixels = full range
      const deltaValue = (deltaY / 150) * range;
      let newValue = startValue.current + deltaValue;
      
      newValue = Math.max(min, Math.min(max, newValue));
      newValue = Math.round(newValue / step) * step;
      
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, min, max, range, onChange, step]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    startValue.current = value;
  };

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeLength = (270 / 360) * circumference;
  
  const dashArray = `${activeLength} ${circumference}`;
  const dashOffset = activeLength - (percentage * activeLength);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div 
        className="relative cursor-ns-resize group" 
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        {/* Background track */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-[225deg]">
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            fill="none" 
            stroke="#27272a" 
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeLinecap="round"
          />
        </svg>

        {/* Active track */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-[225deg] drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]">
          <circle 
            cx={size/2} cy={size/2} r={radius} 
            fill="none" 
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-75"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>

        {/* Inner Knob & Indicator */}
        <div className="absolute inset-2 rounded-full bg-zinc-900 border border-zinc-700 shadow-inner group-hover:border-zinc-500 transition-colors">
          <div 
            className="absolute inset-0 transition-transform duration-75"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-1.5 h-1.5 rounded-full mx-auto mt-1" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
          </div>
        </div>

        {/* Center Value */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-white tracking-tighter">
            {formatValue(value)}
          </span>
        </div>
      </div>

      {label && <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">{label}</span>}
    </div>
  );
}
