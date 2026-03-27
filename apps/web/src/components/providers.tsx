'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { PostHogProvider, PostHogUserIdentifier } from '@/lib/posthog';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PostHogProvider>
      <ToastProvider>
        <PostHogUserIdentifier />
        {children}
      </ToastProvider>
    </PostHogProvider>
  );
}
