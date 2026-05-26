"use client";

import Button from "@/components/ui/button/Button";
import React from "react";

type AddBookingNoticeContentProps = {
  onClose?: () => void;
};

export default function AddBookingNoticeContent({
  onClose,
}: AddBookingNoticeContentProps) {
  return (
    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
      <p>
        Trip bookings are created when customers request rides through the
        customer app. The web console can confirm, decline, and manage existing
        bookings in real time.
      </p>
      <p>
        Manual booking creation from the admin dashboard is not available yet.
        Once that flow is wired up, it will open here as a form modal.
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
