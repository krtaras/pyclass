/** Build a unique-enough slug for teacher-created rows. */
export function teacherSlug(prefix: string, titleOrId: string): string {
  const base = titleOrId
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${base || "item"}-${suffix}`;
}
