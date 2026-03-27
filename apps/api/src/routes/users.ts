import { Router, type Router as ExpressRouter, type Response } from 'express';
import {
  updateDisplayNameSchema,
  avatarPresignedUrlSchema,
  avatarConfirmSchema,
  type ApiErrorResponse,
  type GetCurrentUserResponse,
  type GetUserByIdResponse,
  type UpdateDisplayNameResponse,
  type GetAvatarPresignedUrlResponse,
  type ConfirmAvatarUploadResponse,
  type DeleteAvatarResponse,
} from '@project/shared';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import * as userService from '../services/user.service.js';

const router: ExpressRouter = Router();

// ============================================
// User Profile Routes
// ============================================

// GET /api/users/me - Get current user
router.get(
  '/me',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response<GetCurrentUserResponse | ApiErrorResponse>,
    next
  ) => {
    try {
      const user = await userService.getUserById(req.user!.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res: Response<GetUserByIdResponse | ApiErrorResponse>, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/me - Update current user's display name
router.patch(
  '/me',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response<UpdateDisplayNameResponse | ApiErrorResponse>,
    next
  ) => {
    try {
      const data = updateDisplayNameSchema.parse(req.body);
      const user = await userService.updateUserDisplayName(req.user!.id, data.name);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'Display name updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Avatar Routes
// ============================================

// POST /api/users/me/avatar/presigned - Get presigned URL for avatar upload
router.post(
  '/me/avatar/presigned',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response<GetAvatarPresignedUrlResponse | ApiErrorResponse>,
    next
  ) => {
    try {
      const data = avatarPresignedUrlSchema.parse(req.body);
      const result = await userService.getAvatarUploadUrl(
        req.user!.id,
        data.contentType,
        data.extension
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/users/me/avatar/confirm - Confirm avatar upload
router.post(
  '/me/avatar/confirm',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response<ConfirmAvatarUploadResponse | ApiErrorResponse>,
    next
  ) => {
    try {
      const data = avatarConfirmSchema.parse(req.body);
      const user = await userService.confirmAvatarUpload(req.user!.id, data.key);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'Avatar updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/me/avatar - Delete current user's avatar
router.delete(
  '/me/avatar',
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res: Response<DeleteAvatarResponse | ApiErrorResponse>,
    next
  ) => {
    try {
      const user = await userService.deleteAvatar(req.user!.id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'Avatar deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
