"use client";

import { useEffect, useState } from "react";

/** Keep expenditure circles the same screen size as their fixed money legend. */
export function useMapBubbleZoom(circleColors?: readonly string[]) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!root) return;
    const update = () => {
      let pointIndex = 0;
      root
        .querySelectorAll<SVGCircleElement>("svg circle")
        .forEach((circle) => {
          if (circle.cx.baseVal.value !== 0 || circle.cy.baseVal.value !== 0)
            return;
          // HybridMap accepts one dot color. Its circles follow data order;
          // retain that order while applying each framework's category color.
          const color = circleColors?.[pointIndex++];
          if (color) {
            circle.style.fill = color;
            circle.style.stroke = color;
          }
          let scale = 1;
          let parent = circle.parentElement;
          while (parent && parent !== root) {
            if (parent instanceof SVGGElement) {
              const transforms = parent.transform.baseVal;
              for (let i = 0; i < transforms.numberOfItems; i += 1) {
                const matrix = transforms.getItem(i).matrix;
                scale *= Math.hypot(matrix.a, matrix.b);
              }
            }
            parent = parent.parentElement;
          }
          if (!Number.isFinite(scale) || scale <= 0) return;
          const transform = `scale(${1 / scale})`;
          if (circle.style.transform !== transform) {
            circle.style.transformOrigin = "0px 0px";
            circle.style.transform = transform;
          }
        });
    };
    const observer = new MutationObserver(update);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["transform"],
    });
    update();
    return () => observer.disconnect();
  }, [root, circleColors]);

  return setRoot;
}
