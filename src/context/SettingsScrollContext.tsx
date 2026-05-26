"use client";

import {
  defaultSettingsSectionId,
  settingsNavItems,
} from "@/lib/prochauffeur/settingsNav";
import { usePathname } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type SettingsScrollContextValue = {
  activeSection: string;
  scrollToSection: (id: string) => void;
};

const SettingsScrollContext =
  createContext<SettingsScrollContextValue | null>(null);

function isValidSectionId(id: string): boolean {
  return settingsNavItems.some((item) => item.sectionId === id);
}

function findSectionElement(
  container: HTMLDivElement | null,
  id: string
): HTMLElement | null {
  return (
    container?.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ??
    document.getElementById(id)
  );
}

function scrollSectionIntoView(
  container: HTMLDivElement | null,
  section: HTMLElement
) {
  const canScrollContainer =
    container != null && container.scrollHeight > container.clientHeight + 1;

  if (canScrollContainer) {
    const top =
      section.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;

    container.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
    return;
  }

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SettingsScrollProvider({
  children,
  scrollContainerRef,
}: {
  children: React.ReactNode;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState(defaultSettingsSectionId);

  const scrollToSection = useCallback(
    (id: string) => {
      if (!isValidSectionId(id)) return;

      const attemptScroll = (retriesLeft: number) => {
        const container = scrollContainerRef.current;
        const section = findSectionElement(container, id);

        if (!section) {
          if (retriesLeft > 0) {
            requestAnimationFrame(() => attemptScroll(retriesLeft - 1));
          }
          return;
        }

        scrollSectionIntoView(container, section);
        setActiveSection(id);
      };

      attemptScroll(20);
    },
    [scrollContainerRef]
  );

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash && isValidSectionId(hash)) {
        scrollToSection(hash);
      } else if (!hash) {
        setActiveSection(defaultSettingsSectionId);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [scrollToSection]);

  useEffect(() => {
    if (pathname !== "/settings") return;

    const hash = window.location.hash.slice(1);
    if (hash && isValidSectionId(hash)) {
      scrollToSection(hash);
    }
  }, [pathname, scrollToSection]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let intersectionObserver: IntersectionObserver | null = null;

    const attachObserver = () => {
      const sectionElements = settingsNavItems
        .map((item) => findSectionElement(container, item.sectionId))
        .filter((element): element is HTMLElement => element != null);

      if (sectionElements.length === 0) return false;

      intersectionObserver?.disconnect();
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          const nextActive = visible[0]?.target.id;
          if (!nextActive || !isValidSectionId(nextActive)) return;

          setActiveSection(nextActive);
          const nextHash = `#${nextActive}`;
          if (window.location.hash !== nextHash) {
            window.history.replaceState(
              null,
              "",
              `${window.location.pathname}${window.location.search}${nextHash}`
            );
          }
        },
        {
          root: container,
          rootMargin: "-12% 0px -55% 0px",
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      );

      sectionElements.forEach((element) =>
        intersectionObserver?.observe(element)
      );
      return true;
    };

    if (attachObserver()) {
      return () => intersectionObserver?.disconnect();
    }

    const mutationObserver = new MutationObserver(() => {
      if (attachObserver()) {
        mutationObserver.disconnect();
      }
    });

    mutationObserver.observe(container, { childList: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [scrollContainerRef]);

  return (
    <SettingsScrollContext.Provider
      value={{ activeSection, scrollToSection }}
    >
      {children}
    </SettingsScrollContext.Provider>
  );
}

export function useSettingsScroll() {
  const context = useContext(SettingsScrollContext);
  if (!context) {
    throw new Error(
      "useSettingsScroll must be used within SettingsScrollProvider"
    );
  }
  return context;
}
