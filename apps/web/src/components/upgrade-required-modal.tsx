'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { Button } from './ui/button';

interface UpgradeRequiredModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** The feature or resource that requires upgrade */
  feature?: string;
  /** Current plan name */
  currentPlan?: string;
  /** The limit that was exceeded */
  limit?: number;
  /** Current usage count */
  currentCount?: number;
  /** Unit for the limit (e.g., "members", "projects") */
  limitUnit?: string;
  /** URL to redirect to for upgrading */
  upgradeUrl?: string;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: ReactNode;
}

/**
 * Modal displayed when a user action requires a plan upgrade.
 * Shows information about the limit exceeded and prompts for upgrade.
 *
 * @example
 * ```tsx
 * const [showUpgrade, setShowUpgrade] = useState(false);
 *
 * // In error handler
 * if (isUpgradeRequiredError(error)) {
 *   setShowUpgrade(true);
 * }
 *
 * // In render
 * <UpgradeRequiredModal
 *   isOpen={showUpgrade}
 *   onClose={() => setShowUpgrade(false)}
 *   feature="members"
 *   currentPlan="Starter"
 *   limit={5}
 *   currentCount={5}
 *   limitUnit="members"
 * />
 * ```
 */
export function UpgradeRequiredModal({
  isOpen,
  onClose,
  feature,
  currentPlan,
  limit,
  currentCount,
  limitUnit = 'items',
  upgradeUrl = '/settings/billing',
  title = 'Upgrade Required',
  description,
}: UpgradeRequiredModalProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) {
    return null;
  }

  const defaultDescription = (
    <>
      {currentPlan && (
        <p className="text-gray-600">
          You&apos;re currently on the <strong>{currentPlan}</strong> plan.
        </p>
      )}
      {limit !== undefined && currentCount !== undefined && (
        <p className="mt-2 text-gray-600">
          Your plan allows <strong>{limit}</strong> {limitUnit}, and you&apos;re currently using{' '}
          <strong>{currentCount}</strong>.
        </p>
      )}
      {feature && (
        <p className="mt-2 text-gray-600">Upgrade your plan to get more {feature.toLowerCase()}.</p>
      )}
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-lg bg-white shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                <svg
                  className="h-6 w-6 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
              </span>
              <h2 id="upgrade-modal-title" className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">{description || defaultDescription}</div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg">
            <Button variant="secondary" onClick={onClose}>
              Maybe Later
            </Button>
            <a href={upgradeUrl}>
              <Button variant="primary">View Plans</Button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Context provider for global upgrade modal state.
 * This allows any component to trigger the upgrade modal.
 */
import { createContext, useContext, useState, type PropsWithChildren } from 'react';

interface UpgradeModalState {
  isOpen: boolean;
  feature?: string;
  currentPlan?: string;
  limit?: number;
  currentCount?: number;
  limitUnit?: string;
}

interface UpgradeModalContextValue {
  state: UpgradeModalState;
  showUpgradeModal: (options?: Omit<UpgradeModalState, 'isOpen'>) => void;
  hideUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

/**
 * Provider component that manages the global upgrade modal state.
 *
 * @example
 * ```tsx
 * // In _app.tsx or layout
 * <UpgradeModalProvider>
 *   <App />
 * </UpgradeModalProvider>
 * ```
 */
export function UpgradeModalProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<UpgradeModalState>({ isOpen: false });

  const showUpgradeModal = useCallback((options?: Omit<UpgradeModalState, 'isOpen'>) => {
    setState({ isOpen: true, ...options });
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setState({ isOpen: false });
  }, []);

  return (
    <UpgradeModalContext.Provider value={{ state, showUpgradeModal, hideUpgradeModal }}>
      {children}
      <UpgradeRequiredModal
        isOpen={state.isOpen}
        onClose={hideUpgradeModal}
        feature={state.feature}
        currentPlan={state.currentPlan}
        limit={state.limit}
        currentCount={state.currentCount}
        limitUnit={state.limitUnit}
      />
    </UpgradeModalContext.Provider>
  );
}

/**
 * Hook to access the upgrade modal from any component.
 *
 * @example
 * ```tsx
 * const { showUpgradeModal } = useUpgradeModal();
 *
 * // In error handler
 * if (isUpgradeRequiredError(error)) {
 *   showUpgradeModal({
 *     feature: 'members',
 *     currentPlan: error.currentPlan,
 *     limit: error.limit,
 *     currentCount: error.currentCount,
 *   });
 * }
 * ```
 */
export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error('useUpgradeModal must be used within an UpgradeModalProvider');
  }
  return context;
}
