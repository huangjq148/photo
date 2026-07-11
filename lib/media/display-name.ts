export function normalizeDisplayName(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function getCodePointLength(value: string): number {
  return Array.from(value).length;
}

export function resolveDisplayName(displayName: string | null | undefined, originalName: string) {
  const normalized = normalizeDisplayName(displayName);
  return normalized ?? getOriginalNameWithoutExtension(originalName);
}

export function getOriginalNameWithoutExtension(originalName: string) {
  const baseName = originalName.split(/[\\/]/).pop() ?? originalName;
  const lastDot = baseName.lastIndexOf(".");

  if (lastDot <= 0) {
    return baseName;
  }

  return baseName.slice(0, lastDot) || baseName;
}
