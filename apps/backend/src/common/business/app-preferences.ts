export type AppLanguage = 'az' | 'ru';

export function normalizeAppLanguage(value?: string | null): AppLanguage {
  return value === 'ru' ? 'ru' : 'az';
}

export function mergeAppPreferences(current: Record<string, unknown> | null | undefined, patch: { language?: string | null }) {
  return {
    ...(current ?? {}),
    language: normalizeAppLanguage(patch.language)
  };
}
