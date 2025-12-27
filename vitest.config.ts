import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['utils/**/*.ts', 'lib/**/*.ts', 'store/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/types.ts',
        'lib/server/apiUtils.ts', // Config & Client Instantiation
        'lib/server/gemini.ts', // External API Wrapper
        'utils/imageUtils.ts', // External Storage Wrapper
        'utils/indexnow.ts', // External API Wrapper
        'utils/colorUtils.ts', // Visual Helper
        'store/toastStore.ts', // Trivial UI State
      ],
    },
  },
});
