'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession, useActiveOrganization } from '@/lib/auth-client';
import { Navbar } from '@/components/navbar';
import { Spinner } from '@/components/ui';

const settingsNav = [
  { name: 'Profile', href: '/settings/profile', description: 'Manage your personal account' },
  { name: 'Team', href: '/settings/team', description: 'Manage team members', adminOnly: true },
  {
    name: 'Billing',
    href: '/settings/billing',
    description: 'Subscription and payments',
    adminOnly: true,
  },
  { name: 'Referrals', href: '/settings/referrals', description: 'Earn credits by referring' },
  {
    name: 'Organization',
    href: '/settings/organization',
    description: 'Organization settings',
    adminOnly: true,
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: activeOrg, isPending: orgPending } = useActiveOrganization();

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push('/login');
    }
  }, [session, sessionPending, router]);

  if (sessionPending || orgPending) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  // Get user's role in the active organization
  const currentMember = (activeOrg as { members?: Array<{ role: string }> })?.members?.[0];
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  // Filter nav items based on role
  const visibleNav = settingsNav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account and organization settings</p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 shrink-0">
            <ul className="space-y-1">
              {visibleNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg px-4 py-3 transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="mt-1 block text-sm text-gray-500">{item.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
