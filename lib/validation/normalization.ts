export function normalizeUpperText(value: string): string {
  return value.trim().toLocaleUpperCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function normalizeTrimmedText(value: string): string {
  return value.trim();
}
