/**
 * Date utility functions for review scheduling
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Add days to a date (returns new Date instance)
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Calculate days between two dates (date2 - date1)
 * @param date1 - Start date
 * @param date2 - End date
 * @returns Number of days between dates (ignores time component)
 */
export function daysBetween(date1: Date, date2: Date): number {
  const timeDiff = date2.getTime() - date1.getTime()
  return Math.floor(timeDiff / MS_PER_DAY)
}
