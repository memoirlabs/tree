"use client";

import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { PersonId, TreeCardSize } from "./types";

const measurementsEqual = (
  a: Record<PersonId, TreeCardSize>,
  b: Record<PersonId, TreeCardSize>,
) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key]?.width === b[key]?.width && a[key]?.height === b[key]?.height);
};

const getMeasureId = (element: HTMLElement) => element.dataset.treeMeasureId ?? element.dataset.familyMeasureId;

export function useCardMeasurements(
  containerRef: RefObject<HTMLElement | null>,
  measureKey: string,
): Record<PersonId, TreeCardSize> {
  const [measurements, setMeasurements] = useState<Record<PersonId, TreeCardSize>>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let frameId: number | null = null;
    const selector = "[data-tree-measure-id], [data-family-measure-id]";
    const observedElements = new Set<HTMLElement>();

    const readMeasurements = () => {
      const nextMeasurements: Record<PersonId, TreeCardSize> = {};
      const elements = container.querySelectorAll<HTMLElement>(selector);
      for (const element of elements) {
        const personId = getMeasureId(element);
        if (!personId) continue;
        const rect = element.getBoundingClientRect();
        nextMeasurements[personId] = {
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        };
      }
      setMeasurements((current) => (measurementsEqual(current, nextMeasurements) ? current : nextMeasurements));
    };

    const scheduleRead = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(readMeasurements);
    };

    const resizeObserver = new ResizeObserver(scheduleRead);
    const observeCurrentElements = () => {
      const elements = container.querySelectorAll<HTMLElement>(selector);
      for (const element of elements) {
        if (observedElements.has(element)) continue;
        observedElements.add(element);
        resizeObserver.observe(element);
      }
    };
    const mutationObserver = new MutationObserver(() => {
      observeCurrentElements();
      scheduleRead();
    });

    observeCurrentElements();
    readMeasurements();
    mutationObserver.observe(container, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleRead);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleRead);
    };
  }, [containerRef, measureKey]);

  return measurements;
}
