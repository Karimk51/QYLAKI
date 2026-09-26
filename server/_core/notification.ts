export type NotificationPayload = { title: string; content: string };

/**
 * Self-hosted notification hook. Submissions are persisted before this hook is
 * called. Configure Resend/email separately when owner notifications are needed;
 * the core project never depends on a platform notification service.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!payload.title.trim() || !payload.content.trim()) return false;
  console.info(`[Notification] ${payload.title}`);
  return false;
}
