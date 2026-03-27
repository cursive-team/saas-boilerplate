'use client';

import { useState, useEffect } from 'react';
import { useActiveOrganization } from '@/lib/auth-client';
import { Card, CardTitle, CardDescription, Button, Spinner, useToast } from '@/components/ui';

interface ReferralData {
  referralCode: string;
  referralLink: string;
  credits: number;
  creditsFormatted: string;
  history: Array<{
    id: string;
    referredOrgName: string;
    amount: number;
    createdAt: string;
  }>;
}

export default function ReferralsSettingsPage() {
  const { data: activeOrg, isPending } = useActiveOrganization();
  const { toast } = useToast();

  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (activeOrg) {
      fetchReferralData();
    }
  }, [activeOrg]);

  async function fetchReferralData() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/billing/referrals`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setReferralData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast('Copied to clipboard!', 'success');
      })
      .catch(() => {
        toast('Failed to copy', 'error');
      });
  }

  if (isPending || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!referralData) {
    return (
      <Card>
        <p className="text-gray-600">Failed to load referral data.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Referrals</h2>
        <p className="mt-1 text-sm text-gray-600">Earn credits by referring new organizations</p>
      </div>

      {/* How it Works */}
      <Card>
        <CardTitle className="mb-2">How Referrals Work</CardTitle>
        <CardDescription className="mb-4">
          Earn credits toward your subscription by referring new customers
        </CardDescription>

        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
              1
            </span>
            <span>Share your unique referral link with friends or colleagues</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
              2
            </span>
            <span>They sign up and create an organization using your link</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
              3
            </span>
            <span>When they make their first payment, you earn $20 in credits</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
              4
            </span>
            <span>Credits are automatically applied to your next invoice</span>
          </li>
        </ol>
      </Card>

      {/* Referral Link */}
      <Card>
        <CardTitle className="mb-2">Your Referral Link</CardTitle>
        <CardDescription className="mb-4">Share this link to earn referral credits</CardDescription>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralData.referralLink}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
          />
          <Button onClick={() => copyToClipboard(referralData.referralLink)}>Copy Link</Button>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          Your referral code:{' '}
          <code className="bg-gray-100 px-1 rounded">{referralData.referralCode}</code>
        </div>
      </Card>

      {/* Credits Balance */}
      <Card>
        <CardTitle className="mb-2">Credits Balance</CardTitle>
        <CardDescription className="mb-4">Your earned referral credits</CardDescription>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary-600">
            {referralData.creditsFormatted}
          </span>
          <span className="text-gray-500">in credits</span>
        </div>

        {referralData.credits > 0 && (
          <p className="mt-2 text-sm text-gray-600">
            These credits will be automatically applied to your next invoice.
          </p>
        )}
      </Card>

      {/* Referral History */}
      <Card>
        <CardTitle className="mb-2">Referral History</CardTitle>
        <CardDescription className="mb-4">Organizations you&apos;ve referred</CardDescription>

        {referralData.history.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">No referrals yet</p>
            <p className="text-sm text-gray-400">
              Share your referral link to start earning credits
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {referralData.history.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-gray-900">{referral.referredOrgName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(referral.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className="text-green-600 font-medium">
                  +${(referral.amount / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
