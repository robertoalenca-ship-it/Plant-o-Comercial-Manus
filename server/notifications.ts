import { createNotificationDispatch } from "./db";

export type NotificationChannel = "email" | "whatsapp";

type QueueNotificationInput = {
  profileId: number;
  entityType: string;
  entityId?: number | null;
  recipientDoctorId?: number | null;
  recipientUserId?: number | null;
  channel: NotificationChannel;
  templateKey: string;
  destination?: string | null;
  payload?: Record<string, unknown>;
  scheduledFor?: Date | null;
};

export async function queueNotification(input: QueueNotificationInput) {
  await createNotificationDispatch({
    profileId: input.profileId,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    recipientDoctorId: input.recipientDoctorId ?? null,
    recipientUserId: input.recipientUserId ?? null,
    channel: input.channel,
    templateKey: input.templateKey,
    destination: input.destination ?? null,
    payload: input.payload ?? null,
    scheduledFor: input.scheduledFor ?? null,
    status: "queued",
  });
}

export async function queueDoctorNotifications(
  profileId: number,
  doctorId: number | null | undefined,
  entityType: string,
  entityId: number | null | undefined,
  templateKey: string,
  payload: Record<string, unknown>
) {
  if (!doctorId) return;

  await Promise.all([
    queueNotification({
      profileId,
      entityType,
      entityId,
      recipientDoctorId: doctorId,
      channel: "email",
      templateKey,
      payload,
    }),
    queueNotification({
      profileId,
      entityType,
      entityId,
      recipientDoctorId: doctorId,
      channel: "whatsapp",
      templateKey,
      payload,
    }),
  ]);
}
