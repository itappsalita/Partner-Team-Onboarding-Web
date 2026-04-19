import { V7Generator } from 'uuidv7';

const generator = new V7Generator();

/**
 * Converts a hex UUID string to a standard UUID string (Pass-through for VARCHAR storage).
 * Kept for compatibility with existing code during migration.
 */
export function uuidToBin(uuid: string): string {
  return uuid;
}

/**
 * Converts a standard UUID string to its standard UUID string (Pass-through for VARCHAR storage).
 * Kept for compatibility with existing code during migration.
 */
export function binToUuid(uuid: string): string {
  return uuid;
}

/**
 * Generates a new Time-Ordered UUID v7 string.
 * This is much better for database indexing than v4.
 */
export function generateUuid(): string {
  return generator.generate().toString();
}
