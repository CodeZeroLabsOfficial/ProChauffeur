"use client";

import Button from "@/components/ui/button/Button";
import React from "react";

type AddDriverNoticeContentProps = {
  onClose?: () => void;
};

export default function AddDriverNoticeContent({
  onClose,
}: AddDriverNoticeContentProps) {
  return (
    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
      <p>
        The iOS admin app creates driver Auth accounts through a backend callable
        (similar to `deleteDriverAuth`). The web console can manage existing
        drivers, profiles, and vehicle assignments, but adding a new driver
        still needs that provisioning endpoint wired up.
      </p>
      <p>
        For now, add drivers from the iOS admin app or Firebase Console, then
        manage them here once their users document exists with role driver.
      </p>
      {onClose ? (
        <div className="flex justify-end pt-3">
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}
