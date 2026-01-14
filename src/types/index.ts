// @deprecated Use @/shared/types
export * from '@/shared/types';

// Module Declarations that were in types/index.ts (not strictly types but global declarations)
// Keeping them here or moving to a d.ts file.
// Since this file is treated as a module by 'export *', definitions are fine.
declare module '@sparticuz/chromium';
declare module 'puppeteer-core';
