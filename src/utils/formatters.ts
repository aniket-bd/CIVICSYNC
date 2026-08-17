/**
 * Formats an amount in INR into Cr / Lakhs or standard comma separated currency
 */
export function formatINR(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formats date into readable municipal standard: "15 Sep 2026"
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats meters into km or m
 */
export function formatDistance(meters?: number): string {
  if (!meters || isNaN(meters)) return '0 m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Formats depth in meters: "5.0 m"
 */
export function formatDepth(meters?: number): string {
  if (meters === undefined || meters === null || isNaN(meters)) return 'N/A';
  return `${meters.toFixed(1)} m`;
}
