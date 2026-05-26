"use client";

import { Modal } from "@/components/ui/modal";
import React from "react";

type FormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export default function FormModal({
  isOpen,
  onClose,
  title,
  children,
  className = "max-w-[584px] p-5 lg:p-10",
}: FormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className={className}>
      <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
        {title}
      </h4>
      {children}
    </Modal>
  );
}
