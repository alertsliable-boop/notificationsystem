UPDATE "SubscriptionPlan" SET "name" = 'Starter', "maxActiveEndpoints" = 1, "priceCents" = 1900 WHERE "code" = 'starter';
UPDATE "SubscriptionPlan" SET "name" = 'Professional', "maxActiveEndpoints" = 5, "priceCents" = 5900 WHERE "code" = 'pro';
UPDATE "SubscriptionPlan" SET "name" = 'Business', "maxActiveEndpoints" = 15, "priceCents" = 12900 WHERE "code" = 'business';
