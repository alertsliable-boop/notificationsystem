-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnums safely (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'BILLING');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EndpointStatus') THEN
        CREATE TYPE "EndpointStatus" AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SmsStatus') THEN
        CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'UNDELIVERED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxActiveEndpoints" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stripePriceId" TEXT,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompanySubscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "extraEndpoints" INTEGER NOT NULL DEFAULT 0,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "cardExpMonth" INTEGER,
    "cardExpYear" INTEGER,
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id")
);

-- Ensure columns exist on CompanySubscription if table was already created
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "extraEndpoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "cardBrand" TEXT;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "cardLast4" TEXT;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "cardExpMonth" INTEGER;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "cardExpYear" INTEGER;
ALTER TABLE "CompanySubscription" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Domain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Site" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InboundEndpoint" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "localPart" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "severityTag" TEXT,
    "status" "EndpointStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PhoneRecipient" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "label" TEXT,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PhoneRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EndpointRecipient" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "EndpointRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "subject" TEXT,
    "normalizedMessage" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "webhookEventId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationPayload" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "rawHeaders" TEXT,
    "rawText" TEXT,
    "rawHtml" TEXT,
    "attachmentsMeta" JSONB,

    CONSTRAINT "NotificationPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SmsMessage" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "providerSid" TEXT,
    "status" "SmsStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SmsDeliveryEvent" (
    "id" TEXT NOT NULL,
    "smsMessageId" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL,
    "errorCode" TEXT,
    "rawCallback" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsDeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- BillingInvoice table for in-app charge history
CREATE TABLE IF NOT EXISTS "BillingInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
    "stripeInvoiceId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'paid',
    "description" TEXT NOT NULL,
    "cardBrand" TEXT,
    "cardLast4" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Membership_userId_companyId_key" ON "Membership"("userId", "companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "Domain_hostname_key" ON "Domain"("hostname");
CREATE INDEX IF NOT EXISTS "Customer_companyId_idx" ON "Customer"("companyId");
CREATE INDEX IF NOT EXISTS "Site_companyId_customerId_idx" ON "Site"("companyId", "customerId");
CREATE INDEX IF NOT EXISTS "InboundEndpoint_companyId_status_idx" ON "InboundEndpoint"("companyId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "InboundEndpoint_localPart_domainId_key" ON "InboundEndpoint"("localPart", "domainId");
CREATE INDEX IF NOT EXISTS "PhoneRecipient_companyId_idx" ON "PhoneRecipient"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneRecipient_companyId_phoneE164_key" ON "PhoneRecipient"("companyId", "phoneE164");
CREATE UNIQUE INDEX IF NOT EXISTS "EndpointRecipient_endpointId_recipientId_key" ON "EndpointRecipient"("endpointId", "recipientId");
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_webhookEventId_key" ON "Notification"("webhookEventId");
CREATE INDEX IF NOT EXISTS "Notification_companyId_receivedAt_idx" ON "Notification"("companyId", "receivedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPayload_notificationId_key" ON "NotificationPayload"("notificationId");
CREATE INDEX IF NOT EXISTS "SmsMessage_notificationId_idx" ON "SmsMessage"("notificationId");
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_idempotencyKey_key" ON "WebhookEvent"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "BillingInvoice_companyId_idx" ON "BillingInvoice"("companyId");

-- Foreign key constraints safely (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_userId_fkey') THEN
        ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Membership_companyId_fkey') THEN
        ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanySubscription_companyId_fkey') THEN
        ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CompanySubscription_planId_fkey') THEN
        ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_companyId_fkey') THEN
        ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Site_customerId_fkey') THEN
        ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboundEndpoint_companyId_fkey') THEN
        ALTER TABLE "InboundEndpoint" ADD CONSTRAINT "InboundEndpoint_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboundEndpoint_customerId_fkey') THEN
        ALTER TABLE "InboundEndpoint" ADD CONSTRAINT "InboundEndpoint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboundEndpoint_siteId_fkey') THEN
        ALTER TABLE "InboundEndpoint" ADD CONSTRAINT "InboundEndpoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboundEndpoint_domainId_fkey') THEN
        ALTER TABLE "InboundEndpoint" ADD CONSTRAINT "InboundEndpoint_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PhoneRecipient_companyId_fkey') THEN
        ALTER TABLE "PhoneRecipient" ADD CONSTRAINT "PhoneRecipient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EndpointRecipient_endpointId_fkey') THEN
        ALTER TABLE "EndpointRecipient" ADD CONSTRAINT "EndpointRecipient_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "InboundEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EndpointRecipient_recipientId_fkey') THEN
        ALTER TABLE "EndpointRecipient" ADD CONSTRAINT "EndpointRecipient_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "PhoneRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_endpointId_fkey') THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "InboundEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationPayload_notificationId_fkey') THEN
        ALTER TABLE "NotificationPayload" ADD CONSTRAINT "NotificationPayload_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SmsMessage_notificationId_fkey') THEN
        ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SmsDeliveryEvent_smsMessageId_fkey') THEN
        ALTER TABLE "SmsDeliveryEvent" ADD CONSTRAINT "SmsDeliveryEvent_smsMessageId_fkey" FOREIGN KEY ("smsMessageId") REFERENCES "SmsMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_companyId_fkey') THEN
        ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Insert default subscription plans
INSERT INTO "SubscriptionPlan" ("id", "code", "name", "maxActiveEndpoints", "priceCents")
VALUES 
  ('plan_starter_1', 'starter', 'Starter', 5, 2900),
  ('plan_pro_1', 'pro', 'Professional', 25, 9900),
  ('plan_biz_1', 'business', 'Business', 100, 29900)
ON CONFLICT ("code") DO NOTHING;
