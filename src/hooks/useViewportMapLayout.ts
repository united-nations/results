"use client";

import { useEffect, useState } from "react";

const desktopHeight = 540;
const desktopScale = 1.15;

export function useViewportMapLayout() {
  const [layout, setLayout] = useState({
    height: desktopHeight,
    scale: desktopScale,
  });
  useEffect(() => {
    const resize = () => {
      const { innerWidth, innerHeight } = window;
      const narrow = innerWidth < 640;
      const height =
        innerWidth >= 768 && innerHeight >= 550
          ? desktopHeight
          : Math.max(
              230,
              Math.round(
                Math.min(
                  desktopHeight,
                  innerHeight * 0.56,
                  narrow ? innerWidth * 0.75 : desktopHeight,
                ),
              ),
            );
      const scale = narrow ? 0.9 : desktopScale;
      setLayout((current) =>
        current.height === height && current.scale === scale
          ? current
          : { height, scale },
      );
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return layout;
}
