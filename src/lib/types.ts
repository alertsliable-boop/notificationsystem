/**
 * Shared TypeScript domain types for Liable Alerts.
 * These mirror the Prisma schema but are usable throughout the app without importing Prisma client directly.
 */

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'BILLING';
export type EndpointStatus = 'ACTIVE' | 'INACTIVE';
export type SmsStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'UNDELIVERED';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export interface Company {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface Membership {
  id: string;
  userId: string;
  companyId: string;
  role: Role;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  maxActiveEndpoints: number;
  priceCents: number;
  stripePriceId: string | null;
}

export interface CompanySubscription {
  id: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
  plan: SubscriptionPlan;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  notes: string | null;
  createdAt: Date;
}

export interface Site {
  id: string;
  customerId: string;
  companyId: string;
  name: string;
  address: string | null;
  createdAt: Date;
}

export interface InboundEndpoint {
  id: string;
  companyId: string;
  customerId: string;
  siteId: string;
  domainId: string;
  localPart: string;
  label: string | null;
  notes: string | null;
  severityTag: string | null;
  status: EndpointStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhoneRecipient {
  id: string;
  companyId: string;
  phoneE164: string;
  label: string | null;
  optedOut: boolean;
}

export interface Notification {
  id: string;
  endpointId: string;
  companyId: string;
  subject: string | null;
  normalizedMessage: string;
  receivedAt: Date;
}

export interface SmsMessage {
  id: string;
  notificationId: string;
  recipientId: string;
  providerSid: string | null;
  status: SmsStatus;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// API response shapes
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
