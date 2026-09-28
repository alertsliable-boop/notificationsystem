-- =============================================================================
-- Migration: Recipient Consent, Audit, Downgrade Scheduling, Signup Agreement
-- Run this SQL against the Supabase database.
-- All statements are idempotent (safe to run multiple times).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Recipient Consent State on PhoneRecipient
-- ─────────────────────────────────────────────────────────────────────────────

-- Consent status enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecipientConsentStatus') THEN
    CREATE TYPE "RecipientConsentStatus" AS ENUM ('PENDING', 'ACTIVE', 'OPTED_OUT', 'REVOKED');
  END IF;
END $$;

ALTER TABLE "PhoneRecipient"
  ADD COLUMN IF NOT EXISTS "consentStatus"      TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "consentMethod"      TEXT,
  ADD COLUMN IF NOT EXISTS "consentCertifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consentCertifiedBy" TEXT,        -- userId of the account holder
  ADD COLUMN IF NOT EXISTS "enrollmentSmsSid"   TEXT,        -- Twilio MessageSid for enrollment SMS
  ADD COLUMN IF NOT EXISTS "enrollmentSentAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "confirmedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "optedOutAt"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastConsentEventAt"  TIMESTAMP(3);

-- Index for looking up recipients by phone in webhook handler
CREATE INDEX IF NOT EXISTS "PhoneRecipient_phoneE164_idx" ON "PhoneRecipient"("phoneE164");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Consent Audit Log (append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ConsentAuditLog" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "companyId"          TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "recipientId"        TEXT,               -- null for account-level events
  "recipientPhone"     TEXT,
  "recipientName"      TEXT,
  "userId"             TEXT,               -- account holder who performed action
  "siteId"             TEXT,
  "endpointId"         TEXT,
  "eventType"          TEXT NOT NULL,      -- RECIPIENT_ADDED, CONSENT_CERTIFIED, ENROLLMENT_SMS_SENT, RECIPIENT_CONFIRMED_YES, RECIPIENT_OPTED_OUT_STOP, RECIPIENT_HELP_REQUEST, RECIPIENT_REENROLLED_START
  "previousStatus"     TEXT,
  "newStatus"          TEXT,
  "consentConfirmed"   BOOLEAN NOT NULL DEFAULT false,
  "consentMethod"      TEXT,               -- ACCOUNT_HOLDER_CERTIFIED, DIRECT_SMS_YES, TWILIO_STOP, TWILIO_START
  "ipAddress"          TEXT,
  "twilioMessageSid"   TEXT,
  "twilioOptOutType"   TEXT,
  "metadata"           JSONB,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ConsentAuditLog_companyId_idx"   ON "ConsentAuditLog"("companyId");
CREATE INDEX IF NOT EXISTS "ConsentAuditLog_recipientId_idx" ON "ConsentAuditLog"("recipientId");
CREATE INDEX IF NOT EXISTS "ConsentAuditLog_eventType_idx"   ON "ConsentAuditLog"("eventType");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Account-Level Responsibility Agreement on Company
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "country"            TEXT,
  ADD COLUMN IF NOT EXISTS "city"               TEXT,
  ADD COLUMN IF NOT EXISTS "timezone"           TEXT,
  ADD COLUMN IF NOT EXISTS "responsibilityAgreementAcceptedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "responsibilityAgreementVersion"     TEXT,        -- e.g. "v1-2026-09-28"
  ADD COLUMN IF NOT EXISTS "responsibilityAgreementIp"          TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "country"   TEXT,
  ADD COLUMN IF NOT EXISTS "city"      TEXT,
  ADD COLUMN IF NOT EXISTS "timezone"  TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Scheduled Downgrade on CompanySubscription
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "CompanySubscription"
  ADD COLUMN IF NOT EXISTS "scheduledDowngrade"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "scheduledDowngradeSites"    INTEGER,            -- target site count
  ADD COLUMN IF NOT EXISTS "scheduledDowngradeSiteId"   TEXT,               -- exact site to deactivate
  ADD COLUMN IF NOT EXISTS "scheduledDowngradeDate"     TIMESTAMP(3),       -- effective date (next billing)
  ADD COLUMN IF NOT EXISTS "scheduledDowngradeBy"       TEXT,               -- userId
  ADD COLUMN IF NOT EXISTS "scheduledDowngradeAt"       TIMESTAMP(3);       -- when it was scheduled

-- Index for the scheduled downgrade worker
CREATE INDEX IF NOT EXISTS "CompanySubscription_scheduledDowngrade_idx"
  ON "CompanySubscription"("scheduledDowngrade")
  WHERE "scheduledDowngrade" = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Twilio Inbound Webhook Idempotency Tracking
-- ─────────────────────────────────────────────────────────────────────────────
-- Reuse the existing WebhookEvent table for Twilio inbound messages:
-- source = 'twilio_inbound', idempotencyKey = MessageSid

-- Confirm WebhookEvent table has required columns
ALTER TABLE "WebhookEvent"
  ADD COLUMN IF NOT EXISTS "twilioOptOutType" TEXT;
