type DynamicFieldOption = {
  label: string;
  value: string;
};

export type MaterialDynamicFieldConfig = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: DynamicFieldOption[];
};

export function generateMaterialCode(prefix: string, currentValue: number, padding = 4) {
  const safePrefix = (prefix || 'MAT').trim().toUpperCase();
  const safeValue = Math.max(1, Math.trunc(currentValue));
  return `${safePrefix}-${safeValue.toString().padStart(padding, '0')}`;
}

export function sanitizeMaterialMetadata(
  dynamicFields: MaterialDynamicFieldConfig[] = [],
  metadata: Record<string, unknown> | null | undefined
) {
  const source = metadata ?? {};
  const sanitized: Record<string, unknown> = {};

  for (const field of dynamicFields) {
    const rawValue = source[field.key];
    if (rawValue == null || rawValue === '') {
      continue;
    }

    if (field.type === 'number') {
      const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      if (Number.isFinite(parsed)) {
        sanitized[field.key] = parsed;
      }
      continue;
    }

    if (field.type === 'select') {
      const value = String(rawValue);
      const options = field.options ?? [];
      if (!options.length || options.some((option) => option.value === value)) {
        sanitized[field.key] = value;
      }
      continue;
    }

    sanitized[field.key] = String(rawValue);
  }

  return sanitized;
}
