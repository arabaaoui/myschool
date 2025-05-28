import { describe, it, expect } from 'vitest';
import { formatDateToLong, formatTimestampToLongDateTime } from './formatters';

describe('formatDateToLong', () => {
  it('should format a YYYY-MM-DD date string correctly', () => {
    expect(formatDateToLong('2023-03-15')).toBe('March 15, 2023');
  });

  it('should format an ISO string (date part) correctly, treating as UTC', () => {
    // Note: toLocaleDateString with timeZone:'UTC' might vary slightly in output string
    // depending on the test environment's Intl implementation.
    // This test assumes a common English locale output.
    expect(formatDateToLong('2023-03-15T10:00:00.000Z')).toBe('March 15, 2023');
  });

  it('should return "N/A" for undefined or null input', () => {
    expect(formatDateToLong(undefined)).toBe('N/A');
    expect(formatDateToLong(null)).toBe('N/A');
  });

  it('should return "N/A" for an invalid date string', () => {
    expect(formatDateToLong('invalid-date')).toBe('N/A');
  });
  
  it('should handle different valid date formats if Date constructor can parse them', () => {
    // This depends on Date constructor's leniency, which can vary.
    // Explicit YYYY-MM-DD is preferred for the function's input.
    // Example: "03/15/2023" might parse differently or as invalid in some JS environments.
    // For robustness, the function itself enforces YYYY-MM-DD by appending T00:00:00Z.
    // Let's test with a format that might be passed if not strictly YYYY-MM-DD but parsable.
    // If we pass "2023/03/15", our function appends "T00:00:00Z".
    const result = formatDateToLong('2023/03/15'); // This will be parsed as new Date("2023/03/15T00:00:00Z")
    // Depending on the JS engine, "2023/03/15" might be parsed as local or UTC.
    // Our function standardizes by appending 'T00:00:00Z', making it UTC.
    expect(result).toBe('March 15, 2023');
  });
});

describe('formatTimestampToLongDateTime', () => {
  it('should format an ISO timestamp string correctly to local date and time', () => {
    const date = new Date('2023-03-15T10:30:00.000Z');
    // Expected output will depend on the test runner's locale & timezone.
    // For consistency, we can mock the locale or test specific parts.
    // A simple check:
    const formatted = formatTimestampToLongDateTime('2023-03-15T10:30:00.000Z');
    expect(formatted).toContain('March 15, 2023'); // Date part
    // Time part is harder to test without knowing the exact local timezone of the test runner.
    // e.g., for US Eastern Time (ET), 10:30 UTC is 6:30 AM EDT or 5:30 AM EST.
    // For now, checking for AM/PM is a basic indicator.
    expect(formatted).toMatch(/AM|PM/); 
  });

  it('should return "N/A" for undefined or null input', () => {
    expect(formatTimestampToLongDateTime(undefined)).toBe('N/A');
    expect(formatTimestampToLongDateTime(null)).toBe('N/A');
  });

  it('should return "N/A" for an invalid timestamp string', () => {
    expect(formatTimestampToLongDateTime('invalid-timestamp')).toBe('N/A');
  });
});
