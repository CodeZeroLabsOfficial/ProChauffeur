"use client";

import { Modal } from "@/components/ui/modal";
import React, { useCallback, useEffect, useRef, useState } from "react";

export type SectionNavItem = {
  id: string;
  label: string;
};

type SectionedFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: SectionNavItem[];
  footer: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  scrollToSectionRef?: React.MutableRefObject<(id: string) => void>;
};

export default function SectionedFormModal({
  isOpen,
  onClose,
  title,
  sections,
  footer,
  headerExtra,
  children,
  scrollToSectionRef,
}: SectionedFormModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (isOpen && sections[0]) {
      setActiveSection(sections[0].id);
    }
  }, [isOpen, sections]);

  const scrollToSection = useCallback((id: string) => {
    const container = scrollRef.current;
    const section = container?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!container || !section) return;

    const top =
      section.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;

    container.scrollTo({ top, behavior: "smooth" });
    setActiveSection(id);
  }, []);

  useEffect(() => {
    if (scrollToSectionRef) {
      scrollToSectionRef.current = scrollToSection;
    }
  }, [scrollToSection, scrollToSectionRef]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!isOpen || !container) return;

    const sectionElements = sections
      .map((section) => container.querySelector<HTMLElement>(`#${CSS.escape(section.id)}`))
      .filter((element): element is HTMLElement => element != null);

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const nextActive = visible[0]?.target.id;
        if (nextActive) {
          setActiveSection(nextActive);
        }
      },
      {
        root: container,
        rootMargin: "-12% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    sectionElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [isOpen, sections]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containScroll
      className="flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden p-0"
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
        <h4 className="pr-10 text-lg font-medium text-gray-800 dark:text-white/90">
          {title}
        </h4>
      </div>

      {headerExtra ? (
        <div className="shrink-0 px-5 pt-4 sm:px-6">{headerExtra}</div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          aria-label="Form sections"
          className="shrink-0 border-b border-gray-200 dark:border-gray-800 md:w-52 md:border-b-0 md:border-r"
        >
          <ul className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-x-visible md:p-4">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <li key={section.id} className="shrink-0 md:shrink">
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`relative w-full rounded-lg px-3 py-2 text-left text-sm transition-colors md:px-4 md:py-2.5 ${
                      isActive
                        ? "bg-brand-50 font-medium text-brand-600 before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-full before:bg-brand-500 dark:bg-brand-500/10 dark:text-brand-400 dark:before:bg-brand-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6"
        >
          {children}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
        {footer}
      </div>
    </Modal>
  );
}

export function FormSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-2 pb-10 last:pb-2">
      <h5 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h5>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
