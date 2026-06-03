export type NotificationAction = "created" | "updated" | "deleted";

export type NotificationCategory =
  | "driver"
  | "vehicle"
  | "profile"
  | "company"
  | "location"
  | "operating_hours"
  | "locale"
  | "pricing"
  | "invoice"
  | "admin";

export type ActivityNotification = {
  id: string;
  category: NotificationCategory;
  action: NotificationAction;
  title: string;
  message: string;
  href?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  readAt?: Date | null;
  createdAt: Date;
};

export type CreateActivityNotificationInput = {
  category: NotificationCategory;
  action: NotificationAction;
  title: string;
  message: string;
  href?: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
};
