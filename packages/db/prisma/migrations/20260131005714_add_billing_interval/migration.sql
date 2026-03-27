-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "customPlanConfig" TEXT,
ADD COLUMN     "customStripePriceId" TEXT;

-- CreateTable
CREATE TABLE "processed_stripe_event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_stripe_event_pkey" PRIMARY KEY ("id")
);
