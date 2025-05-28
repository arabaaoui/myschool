// src/utils/formatters.ts

/**
 * Formats a date string (YYYY-MM-DD or ISO string) into a more readable format.
 * Example: "2023-10-26" becomes "October 26, 2023"
 * @param dateString The date string to format.
 * @param options Intl.DateTimeFormatOptions to customize formatting.
 * @returns The formatted date string, or "N/A" if the input is invalid or null.
 */
export const formatDateToLong = (
  dateString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return 'N/A';
  try {
    // Ensure the date string is treated as UTC to avoid timezone shifts if only date is provided
    // If it's already a full ISO string, new Date() will handle it.
    // If it's YYYY-MM-DD, appending T00:00:00Z makes it UTC.
    const dateInput = dateString.includes('T') ? dateString : `${dateString}T00:00:00Z`;
    const date = new Date(dateInput);
    
    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC', // Specify UTC to ensure consistency if input was YYYY-MM-DD
    };
    return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return 'N/A'; // Return N/A or throw error as per desired error handling
  }
};

/**
 * Formats a timestamp string (ISO string) into a more readable date and time format.
 * Example: "2023-10-26T14:30:00.000Z" becomes "October 26, 2023, 2:30 PM" (local time)
 * @param timestampString The timestamp string to format.
 * @param options Intl.DateTimeFormatOptions to customize formatting.
 * @returns The formatted date and time string, or "N/A" if the input is invalid or null.
 */
export const formatTimestampToLongDateTime = (
  timestampString: string | undefined | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!timestampString) return 'N/A';
  try {
    const date = new Date(timestampString);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true, // Use AM/PM
    };
    return date.toLocaleString(undefined, { ...defaultOptions, ...options });
  } catch (error) {
    console.error("Error formatting timestamp:", timestampString, error);
    return 'N/A';
  }
};
