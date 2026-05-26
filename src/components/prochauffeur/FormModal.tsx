"use client";

import { Modal, ModalCloseButton } from "@/components/ui/modal";
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
  className = "max-w-[584px] overflow-hidden p-0",
}: FormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className={className}>
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800 sm:px-6">
        <h4 className="text-lg font-medium text-gray-800 dark:text-white/90">
          {title}
        </h4>
        <ModalCloseButton onClose={onClose} />
      </div>
      <div className="p-5 lg:p-10">{children}</div>
    </Modal>
  );
}
