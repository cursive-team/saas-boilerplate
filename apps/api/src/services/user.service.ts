import { prisma } from '@project/db';
import { deleteFile, getPresignedUploadUrl, getPresignedDownloadUrl } from '@project/blob';
import type { UserPublic, PresignedUploadResult } from '@project/shared';
import { generateAvatarKey } from '../lib/storage.js';
import { logger } from '@project/logger';

// ============================================
// User Queries
// ============================================

/**
 * Get a user by ID with optional avatar URL
 */
export async function getUserById(userId: string): Promise<UserPublic | null> {
  logger.debug({ userId }, 'Fetching user by ID');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      avatarKey: true,
      createdAt: true,
    },
  });

  if (!user) {
    logger.debug({ userId }, 'User not found');
    return null;
  }

  // Generate presigned download URL for avatar if exists
  let image: string | null = null;
  if (user.avatarKey) {
    try {
      image = await getPresignedDownloadUrl(user.avatarKey, 3600);
      logger.debug({ userId, avatarKey: user.avatarKey }, 'Generated avatar presigned URL');
    } catch (error) {
      logger.warn(
        { userId, avatarKey: user.avatarKey, error },
        'Failed to generate avatar presigned URL'
      );
    }
  }

  const result: UserPublic = {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    image,
    createdAt: user.createdAt.toISOString(),
  };

  logger.debug({ userId }, 'User fetched successfully');
  return result;
}

/**
 * Update user's display name
 */
export async function updateUserDisplayName(
  userId: string,
  name: string
): Promise<UserPublic | null> {
  logger.info({ userId, newName: name }, 'Updating user display name');

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        avatarKey: true,
        createdAt: true,
      },
    });

    let image: string | null = null;
    if (user.avatarKey) {
      try {
        image = await getPresignedDownloadUrl(user.avatarKey, 3600);
      } catch (error) {
        logger.warn({ userId, error }, 'Failed to generate avatar presigned URL after name update');
      }
    }

    const result: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image,
      createdAt: user.createdAt.toISOString(),
    };

    logger.info({ userId, name }, 'User display name updated successfully');
    return result;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      logger.warn({ userId }, 'User not found for display name update');
      return null;
    }
    logger.error({ userId, error }, 'Failed to update user display name');
    throw error;
  }
}

// ============================================
// Avatar Operations
// ============================================

/**
 * Get a presigned URL for avatar upload
 */
export async function getAvatarUploadUrl(
  userId: string,
  contentType: string,
  extension: string
): Promise<PresignedUploadResult> {
  logger.info({ userId, contentType, extension }, 'Generating avatar upload URL');

  const key: string = generateAvatarKey(userId, extension);

  try {
    const result = await getPresignedUploadUrl(key, contentType);

    logger.info({ userId, key }, 'Avatar upload URL generated');

    const response: PresignedUploadResult = {
      uploadUrl: result.uploadUrl,
      key: result.key,
    };

    return response;
  } catch (error) {
    logger.error({ userId, error }, 'Failed to generate avatar upload URL');
    throw error;
  }
}

/**
 * Confirm avatar upload and update user record
 */
export async function confirmAvatarUpload(userId: string, key: string): Promise<UserPublic | null> {
  logger.info({ userId, key }, 'Confirming avatar upload');

  // Get current avatar to delete old one
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarKey: true },
  });

  // Delete old avatar if exists
  if (currentUser?.avatarKey) {
    logger.debug({ userId, oldKey: currentUser.avatarKey }, 'Deleting old avatar');
    try {
      await deleteFile(currentUser.avatarKey);
      logger.debug({ userId, oldKey: currentUser.avatarKey }, 'Old avatar deleted');
    } catch (error) {
      logger.warn(
        { userId, oldKey: currentUser.avatarKey, error },
        'Failed to delete old avatar (continuing anyway)'
      );
    }
  }

  // Update user with new avatar key
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarKey: key },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        avatarKey: true,
        createdAt: true,
      },
    });

    const image: string = await getPresignedDownloadUrl(key, 3600);

    const result: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image,
      createdAt: user.createdAt.toISOString(),
    };

    logger.info({ userId, key }, 'Avatar upload confirmed');
    return result;
  } catch (error) {
    logger.error({ userId, key, error }, 'Failed to confirm avatar upload');
    throw error;
  }
}

/**
 * Delete user's avatar
 */
export async function deleteAvatar(userId: string): Promise<UserPublic | null> {
  logger.info({ userId }, 'Deleting user avatar');

  // Get current avatar key
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarKey: true },
  });

  if (!currentUser) {
    logger.warn({ userId }, 'User not found for avatar deletion');
    return null;
  }

  // Delete from storage if exists
  if (currentUser.avatarKey) {
    logger.debug({ userId, key: currentUser.avatarKey }, 'Deleting avatar from storage');
    try {
      await deleteFile(currentUser.avatarKey);
      logger.debug({ userId, key: currentUser.avatarKey }, 'Avatar deleted from storage');
    } catch (error) {
      logger.warn(
        { userId, key: currentUser.avatarKey, error },
        'Failed to delete avatar from storage (continuing anyway)'
      );
    }
  }

  // Update user record
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarKey: null },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        avatarKey: true,
        createdAt: true,
      },
    });

    const result: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: null,
      createdAt: user.createdAt.toISOString(),
    };

    logger.info({ userId }, 'User avatar deleted successfully');
    return result;
  } catch (error) {
    logger.error({ userId, error }, 'Failed to delete user avatar');
    throw error;
  }
}
