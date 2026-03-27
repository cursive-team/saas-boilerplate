'use client';

import { useState } from 'react';
import { Button, Input, Label, Card, CardTitle, CardDescription, Alert } from '@/components/ui';
import type { ApiErrorResponse } from '@project/shared';

interface DisplayNameEditorProps {
  currentName: string | null;
  onUpdate?: () => void;
}

export function DisplayNameEditor({
  currentName,
  onUpdate,
}: DisplayNameEditorProps): React.ReactNode {
  const [name, setName] = useState<string>(currentName || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const apiUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response: Response = await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to update display name' });
        return;
      }

      await response.json(); // UpdateDisplayNameResponse - we don't need the data
      setMessage({ type: 'success', text: 'Display name updated successfully!' });
      onUpdate?.();
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle className="mb-2">Display Name</CardTitle>
      <CardDescription className="mb-4">
        This is how your name will appear throughout the application.
      </CardDescription>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="displayName" className="mb-1">
            Your display name
          </Label>
          <Input
            id="displayName"
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setName(e.target.value)}
            placeholder="Enter your display name"
            required
            minLength={1}
            maxLength={100}
          />
        </div>

        {message && <Alert variant={message.type}>{message.text}</Alert>}

        <Button type="submit" disabled={loading || name.trim() === (currentName || '')}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Card>
  );
}
