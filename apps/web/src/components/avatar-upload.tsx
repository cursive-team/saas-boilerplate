'use client';

import { useState, useRef } from 'react';
import { Button, Card, CardTitle, CardDescription, Alert, Avatar, Spinner } from '@/components/ui';
import type { GetAvatarPresignedUrlResponse, ConfirmAvatarUploadResponse } from '@project/shared';

interface AvatarUploadProps {
  currentImage: string | null;
  userId: string;
  onUpdate?: () => void;
}

export function AvatarUpload({ currentImage, userId, onUpdate }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Please select a valid image (JPEG, PNG, GIF, or WebP)',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    // Show preview
    const reader: FileReader = new FileReader();
    reader.onloadend = (): void => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadFile(file);
  }

  async function uploadFile(file: File): Promise<void> {
    setLoading(true);
    setMessage(null);

    try {
      // Get file extension
      const extension: string = file.name.split('.').pop()?.toLowerCase() || 'jpg';

      // Step 1: Get presigned URL from Express API
      const presignedRes: Response = await fetch(`${apiUrl}/api/users/me/avatar/presigned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contentType: file.type,
          extension,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const presignedJson: GetAvatarPresignedUrlResponse = await presignedRes.json();
      const { uploadUrl, key } = presignedJson.data;

      // Step 2: Upload directly to blob storage (bypasses our server)
      const uploadRes: Response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      // Step 3: Confirm upload and update user record
      const confirmRes: Response = await fetch(`${apiUrl}/api/users/me/avatar/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key }),
      });

      if (!confirmRes.ok) {
        throw new Error('Failed to save avatar');
      }

      const confirmJson: ConfirmAvatarUploadResponse = await confirmRes.json();

      // Update preview with new presigned URL
      if (confirmJson.data.image) {
        setPreview(confirmJson.data.image);
      }

      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      onUpdate?.();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload avatar',
      });
      // Reset preview on error
      setPreview(currentImage);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setLoading(true);
    setMessage(null);

    try {
      const res: Response = await fetch(`${apiUrl}/api/users/me/avatar`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to delete avatar');
      }

      await res.json(); // DeleteAvatarResponse - we don't need the data

      setPreview(null);
      setMessage({ type: 'success', text: 'Avatar deleted successfully!' });
      onUpdate?.();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete avatar',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle className="mb-2">Profile Picture</CardTitle>
      <CardDescription className="mb-4">
        Upload a profile picture. Max 5MB, JPEG/PNG/GIF/WebP.
      </CardDescription>

      <div className="flex items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative">
          <Avatar src={preview} fallback={userId.charAt(0)} size="xl" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <Spinner size="md" className="border-white border-t-transparent" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            size="sm"
          >
            {loading ? 'Uploading...' : 'Upload New'}
          </Button>
          {preview && (
            <Button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Alert variant={message.type} className="mt-4">
          {message.text}
        </Alert>
      )}
    </Card>
  );
}
