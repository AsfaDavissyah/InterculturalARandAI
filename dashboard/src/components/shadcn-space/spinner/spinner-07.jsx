"use client";
import { memo } from "react";
import { cn } from "@/lib/utils";

const sizeConfig = {
  sm: {
    container: "size-12",
    core: "size-2.5",
    satellite: "size-1.5",
    pathWidth: "border-[0.5px]",
    orbitRadius: "inset-0",
  },

  md: {
    container: "size-20",
    core: "size-4",
    satellite: "size-2.5",
    pathWidth: "border-[1px]",
    orbitRadius: "inset-0",
  },

  lg: {
    container: "size-32",
    core: "size-6",
    satellite: "size-4",
    pathWidth: "border-[1.5px]",
    orbitRadius: "inset-0",
  }
};

const OrbitalSpinner = memo(({
  size = "sm",
  className,
  ...props
}) => {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center animate-in fade-in zoom-in-80 duration-300",
        config.container,
        className
      )}
      {...props}
    >
      {/* Central Core */}
      <div
        className={cn(
          "z-10 animate-pulse rounded-full bg-foreground",
          config.core
        )}
      />

      {/* Orbital Path (The faint circle) */}
      <div 
        className={cn(
          "absolute rounded-full border-foreground/10",
          config.pathWidth,
          config.orbitRadius,
          "size-full"
        )} 
      />

      {/* Satellite Container (Rotating) */}
      <div className="absolute inset-0 animate-spin [animation-duration:2.5s]">
        {/* Satellite Dot */}
        <div 
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground",
            config.satellite
          )} 
        />
      </div>
    </div>
  );
});

OrbitalSpinner.displayName = "OrbitalSpinner";

export default OrbitalSpinner;
