/**
 * Utility functions for formatting timestamps and detecting visit status
 * Used for displaying horario_visita_timestamp in dashboard components
 */

// Visit status types
export type VisitStatus = 'past' | 'today' | 'soon' | 'future' | null;

/**
 * Format ISO timestamp to DD/MM/YYYY H:MMam/pm in Lima timezone
 * @param timestamp - ISO timestamp string (e.g., "2025-10-14T20:00:00.000Z")
 * @param timezone - IANA timezone (default: "America/Lima")
 * @returns Formatted string like "14/10/2025 3:00pm" or null if invalid
 */
export function formatVisitTimestamp(
  timestamp: string | null,
  timezone: string = 'America/Lima'
): string | null {
  if (!timestamp) return null;

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;

    // Format date part: DD/MM/YYYY
    const day = date.toLocaleString('es-PE', { day: '2-digit', timeZone: timezone });
    const month = date.toLocaleString('es-PE', { month: '2-digit', timeZone: timezone });
    const year = date.toLocaleString('es-PE', { year: 'numeric', timeZone: timezone });

    // Format time part: H:MMam/pm (12-hour format with uppercase AM/PM)
    const hour = date.toLocaleString('en-US', { hour: 'numeric', hour12: true, timeZone: timezone });
    const minute = date.toLocaleString('es-PE', { minute: '2-digit', timeZone: timezone });

    // Parse hour to get just the number without am/pm
    const hourMatch = hour.match(/^(\d+)/);
    const hourNum = hourMatch ? hourMatch[1] : '0';

    // Get AM/PM (uppercase)
    const period = hour.toLowerCase().includes('pm') ? 'PM' : 'AM';

    return `${day}/${month}/${year} ${hourNum}:${minute}${period}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return null;
  }
}

/**
 * Get visit status based on timestamp
 * @param timestamp - ISO timestamp string
 * @returns 'past' | 'today' | 'soon' (within 24h) | 'future' | null
 */
export function getVisitStatus(timestamp: string | null): VisitStatus {
  if (!timestamp) return null;

  try {
    const visitDate = new Date(timestamp);
    if (isNaN(visitDate.getTime())) return null;

    const now = new Date();
    const diffMs = visitDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Past: visit time has already passed
    if (diffMs < 0) return 'past';

    // Today: same calendar day
    const isToday =
      visitDate.getDate() === now.getDate() &&
      visitDate.getMonth() === now.getMonth() &&
      visitDate.getFullYear() === now.getFullYear();

    if (isToday) return 'today';

    // Soon: within 24 hours from now
    if (diffHours <= 24) return 'soon';

    // Future: more than 24 hours away
    return 'future';
  } catch (error) {
    console.error('Error getting visit status:', error);
    return null;
  }
}

/**
 * Check if visit is upcoming (not in the past)
 * @param timestamp - ISO timestamp string
 * @returns true if visit is in the future or today
 */
export function isVisitUpcoming(timestamp: string | null): boolean {
  const status = getVisitStatus(timestamp);
  return status === 'today' || status === 'soon' || status === 'future';
}

/**
 * Get status badge classes for visual indicators
 * @param status - Visit status
 * @returns Tailwind CSS classes for badge styling
 */
export function getVisitStatusClasses(status: VisitStatus): string {
  switch (status) {
    case 'past':
      return 'bg-gray-200 text-gray-600'; // Gray - past visit
    case 'today':
      return 'bg-green-100 text-green-700 border border-green-300'; // Green - visit today
    case 'soon':
      return 'bg-yellow-100 text-yellow-700 border border-yellow-300'; // Yellow - visit soon (within 24h)
    case 'future':
      return 'bg-blue-100 text-blue-700 border border-blue-300'; // Blue - future visit
    default:
      return 'bg-gray-100 text-gray-600'; // Default gray
  }
}

/**
 * Get status badge label
 * @param status - Visit status
 * @returns Human-readable label
 */
export function getVisitStatusLabel(status: VisitStatus): string {
  switch (status) {
    case 'past':
      return 'Pasado';
    case 'today':
      return 'Hoy';
    case 'soon':
      return 'Próximo (24h)';
    case 'future':
      return 'Futuro';
    default:
      return '';
  }
}
