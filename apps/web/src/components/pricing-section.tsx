'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components/ui';

interface PlanPricing {
  monthly: number | null;
  annual: number | null;
  annualPerMonth: number | null;
}

interface PlanFeatures {
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

interface PlanLimits {
  // Flexible limits - add any metric you need
  // exampleResource is a placeholder, replace with your actual resource names
  [key: string]: number;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  monthlyPrice: number | null;
  features: PlanFeatures;
  limits: PlanLimits;
  pricing: PlanPricing;
}

interface ConfigResponse {
  appName: string;
  version: string;
  trial: {
    durationDays: number;
    requireCard: boolean;
  };
  billing: {
    annualDiscountPercent: number;
  };
  referrals: {
    enabled: boolean;
  };
  plans: Plan[];
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function formatLimit(value: number, unit: string): string {
  if (value === -1) return 'Unlimited';
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M ${unit}`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K ${unit}`;
  return `${value} ${unit}`;
}

function PlanCard({
  plan,
  isAnnual,
  signupUrl,
  isPopular,
}: {
  plan: Plan;
  isAnnual: boolean;
  signupUrl: string;
  isPopular?: boolean;
}) {
  const isEnterprise = plan.monthlyPrice === null;
  const price = isAnnual ? plan.pricing.annualPerMonth : plan.pricing.monthly;

  return (
    <Card
      className={`relative flex flex-col p-6 ${isPopular ? 'ring-2 ring-primary-500 border-primary-200' : 'border-gray-200'}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <p className="text-gray-600 mt-1">{plan.description}</p>
      </div>

      <div className="mb-6">
        {isEnterprise ? (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">Custom</span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">${price}</span>
            <span className="text-gray-500 ml-1">/month</span>
          </div>
        )}
        {!isEnterprise && isAnnual && (
          <p className="text-sm text-emerald-600 mt-1">
            Save{' '}
            {Math.round(
              ((plan.pricing.monthly! - plan.pricing.annualPerMonth!) / plan.pricing.monthly!) * 100
            )}
            % with annual billing
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-grow">
        {/* Display usage limits - customize the label based on your resource type */}
        {plan.limits.exampleResource !== undefined && (
          <li className="flex items-start gap-2">
            <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">
              {formatLimit(plan.limits.exampleResource, 'resources/month')}
            </span>
          </li>
        )}
        <li className="flex items-start gap-2">
          {plan.features.apiAccess ? (
            <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XIcon className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
          )}
          <span className={plan.features.apiAccess ? 'text-gray-700' : 'text-gray-400'}>
            API Access
          </span>
        </li>
        <li className="flex items-start gap-2">
          {plan.features.advancedReports ? (
            <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XIcon className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
          )}
          <span className={plan.features.advancedReports ? 'text-gray-700' : 'text-gray-400'}>
            Advanced Reports
          </span>
        </li>
        <li className="flex items-start gap-2">
          {plan.features.prioritySupport ? (
            <CheckIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <XIcon className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
          )}
          <span className={plan.features.prioritySupport ? 'text-gray-700' : 'text-gray-400'}>
            Priority Support
          </span>
        </li>
      </ul>

      {isEnterprise ? (
        <Link href="mailto:sales@example.com">
          <Button variant="secondary" className="w-full">
            Contact Sales
          </Button>
        </Link>
      ) : (
        <Link
          href={`${signupUrl}${signupUrl.includes('?') ? '&' : '?'}plan=${plan.id}${isAnnual ? '&interval=annual' : ''}`}
        >
          <Button variant={isPopular ? 'primary' : 'secondary'} className="w-full">
            Start Free Trial
          </Button>
        </Link>
      )}
    </Card>
  );
}

export function PricingSection({ signupUrl }: { signupUrl: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/config`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Config API error:', response.status, errorText);
          throw new Error(`Failed to fetch config: ${response.status}`);
        }
        const data: ConfigResponse = await response.json();
        setPlans(data.plans);
        setDiscountPercent(data.billing.annualDiscountPercent);
      } catch (err) {
        console.error('Failed to load pricing:', err);
        setError('Failed to load pricing. Please ensure the API server is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-96 bg-gray-100 animate-pulse rounded-2xl border border-gray-200"
          ></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex items-center border border-gray-200">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !isAnnual ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isAnnual ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setIsAnnual(true)}
          >
            Annual
            <span className="ml-1.5 text-xs text-emerald-600 font-semibold">
              Save {discountPercent}%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isAnnual={isAnnual}
            signupUrl={signupUrl}
            isPopular={plan.id === 'pro'}
          />
        ))}
      </div>
    </div>
  );
}
