/**
 * Feature flag for AI exercise hints.
 * Unset or any value other than "true" keeps hints off (default).
 */
export function isHintsEnabled(): boolean {
  return process.env.HINTS_ENABLED === "true";
}
