/**
 * Meridian — Input Sanitization Utilities
 * Defends against XSS (Cross-Site Scripting) and injection attacks.
 */

/**
 * Strip potentially dangerous HTML/script content from user input.
 * Used on goal titles, descriptions, and check-in comments.
 */
export function sanitizeTextInput(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, '')
    // Remove on* event handlers
    .replace(/\bon\w+\s*=/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize a cell value for CSV export to prevent formula injection (CWE-74).
 * Prefixes dangerous starting characters with an apostrophe.
 */
export function sanitizeCSVCell(value: unknown): string {
  const str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
  return str;
}
