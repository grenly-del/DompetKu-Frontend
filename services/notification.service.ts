import storage from './storage';

export type NotificationSettings = {
  daily: boolean;
  budget: boolean;
  weekly: boolean;
  tips: boolean;
  promo: boolean;
};

const STORAGE_KEY_PREFIX = 'notification-settings';

export const defaultNotificationSettings: NotificationSettings = {
  daily: true,
  budget: true,
  weekly: false,
  tips: true,
  promo: false,
};

function normalizeSettings(value: unknown): NotificationSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultNotificationSettings;
  }

  const candidate = value as Partial<NotificationSettings>;

  return {
    daily: candidate.daily ?? defaultNotificationSettings.daily,
    budget: candidate.budget ?? defaultNotificationSettings.budget,
    weekly: candidate.weekly ?? defaultNotificationSettings.weekly,
    tips: candidate.tips ?? defaultNotificationSettings.tips,
    promo: candidate.promo ?? defaultNotificationSettings.promo,
  };
}

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

export async function loadNotificationSettings(userId: string | null | undefined): Promise<NotificationSettings> {
  if (!userId) {
    return defaultNotificationSettings;
  }

  try {
    const raw = await storage.getItem(getStorageKey(userId));
    if (!raw) {
      return defaultNotificationSettings;
    }

    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaultNotificationSettings;
  }
}

export async function saveNotificationSettings(
  userId: string | null | undefined,
  settings: NotificationSettings
): Promise<void> {
  if (!userId) {
    return;
  }

  await storage.setItem(getStorageKey(userId), JSON.stringify(settings));
}
