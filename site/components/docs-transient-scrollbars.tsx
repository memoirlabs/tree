"use client";

import { useEffect } from "react";

const SCROLLBAR_VISIBLE_MS = 900;

function getScrollElement(target: EventTarget | null): HTMLElement | null {
  if (target === window || target === document) {
    return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement;
  }

  return target instanceof HTMLElement ? target : null;
}

export function DocsTransientScrollbars() {
  useEffect(() => {
    const html = document.documentElement;
    const scrollEndTimers = new Map<HTMLElement, number>();

    html.dataset.docsScrollbars = "true";

    const markScrolling = (element: HTMLElement) => {
      element.dataset.docsScrollbarActive = "true";

      const currentTimer = scrollEndTimers.get(element);
      if (currentTimer !== undefined) {
        window.clearTimeout(currentTimer);
      }

      const nextTimer = window.setTimeout(() => {
        delete element.dataset.docsScrollbarActive;
        scrollEndTimers.delete(element);
      }, SCROLLBAR_VISIBLE_MS);

      scrollEndTimers.set(element, nextTimer);
    };

    const onScroll = (event: Event) => {
      const element = getScrollElement(event.target);
      if (element) {
        markScrolling(element);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });

      for (const [element, timer] of scrollEndTimers) {
        window.clearTimeout(timer);
        delete element.dataset.docsScrollbarActive;
      }

      delete html.dataset.docsScrollbars;
    };
  }, []);

  return null;
}
