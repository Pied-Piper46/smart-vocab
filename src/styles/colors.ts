/**
 * Design System Colors
 * 
 * Centralized color definitions for VocabMaster application.
 * This ensures consistency across all components and easy maintenance.
 */

export const COLORS = {
  // Primary brand color (green theme)
  primary: '#10b981',
  primaryDark: '#047857',
  primaryLight: '#34d399',
  
  // Text colors
  text: '#2C3538',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  
  // Background colors
  bg: '#ffffff',
  bgGray: '#f9fafb',
  cardBg: '#ffffff',
  accent: '#f0f8f5',
  
  // Border and divider colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  uncompleted: '#e5e7eb',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Status colors for mastery levels
  statusNew: '#3b82f6',
  statusLearning: '#eab308',
  statusReviewing: '#8b5cf6',
  statusMastered: '#10b981',
} as const;

// Type for color keys (for TypeScript autocompletion)
export type ColorKey = keyof typeof COLORS;