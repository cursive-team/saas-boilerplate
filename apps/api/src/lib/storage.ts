/**
 * Storage utilities for the API
 */

/**
 * Generate a unique key for avatar uploads
 * Format: avatars/{userId}/{timestamp}.{extension}
 */
export function generateAvatarKey(userId: string, extension: string): string {
  const timestamp = Date.now();
  return `avatars/${userId}/${timestamp}.${extension}`;
}
