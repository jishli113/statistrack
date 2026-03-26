/** Single canonical form for auth lookups (avoid case-only mismatches vs Postgres exact match). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
