'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui';

export function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link
              href={session?.user ? '/dashboard' : '/'}
              className="text-xl font-semibold tracking-tight text-gray-900 hover:text-primary-600 transition-colors"
            >
              App
            </Link>
            {session?.user && (
              <div className="hidden sm:flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings/profile"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Settings
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isPending ? (
              <span className="text-sm text-gray-400">Loading...</span>
            ) : session?.user ? (
              <>
                <span className="hidden sm:block text-sm text-gray-600">
                  {session.user.name || session.user.email}
                </span>
                <Button onClick={handleSignOut} variant="secondary" size="sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
