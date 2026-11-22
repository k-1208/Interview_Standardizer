/**
 * Helpers for keeping personal data out of logs. Logs are usually retained longer
 * and guarded less than the database, so we log identifiers and counts, not content.
 */

/** "jane.doe@example.com" -> "j***@example.com" */
export const maskEmail = (email: string | null | undefined) => {
  if (!email) return '(none)';
  const [local = '', domain = ''] = email.split('@');
  return domain ? `${local.slice(0, 1)}***@${domain}` : '***';
};
