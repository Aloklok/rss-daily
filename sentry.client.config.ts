// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://4100812774eda13219a7226400aea041@o4510530479063040.ingest.us.sentry.io/4510530481356800',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this to 1.0 will capture 100% of the session
  // We disable it to save bundle size and quota
  replaysSessionSampleRate: 0,

  // Setting this to 1.0 will capture 100% of the session if an error occurs
  replaysOnErrorSampleRate: 0,

  // Disable debug logs to save bundle size
  enableLogs: false,

  // Disable PII to reduce payload size and privacy risk
  sendDefaultPii: false,

  // Disable in development
  enabled: process.env.NODE_ENV !== 'development',

  // Optional: Custom integrations filter if needed in future
  // integrations: (integrations) => {
  //   return integrations.filter((integration) => integration.name !== 'Breadcrumbs');
  // },
});
