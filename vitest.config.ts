import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [tsconfigPaths()],
  define: {
    'process.env': {},
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'e2e/**',
      'src/lib/server/__tests__/**',
      'src/shared/utils/__tests__/serverSanitize.test.ts',
    ],
    include: [
      'src/**/*.test.tsx',
      'src/**/__tests__/*.test.tsx',
      'src/**/*.test.ts',
      'src/**/__tests__/*.test.ts',
      'e2e/**/*.spec.ts',
    ],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'utils/**/*.ts',
        'lib/**/*.ts',
        'store/**/*.ts',
        'src/domains/**/*.ts',
        'src/shared/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        'utils/__tests__/**',
        '**/*.d.ts',
        '**/types.ts',
        'lib/server/apiUtils.ts',
        'lib/server/gemini.ts',
        'utils/imageUtils.ts',
        'utils/indexnow.ts',
        'utils/colorUtils.ts',
        'store/toastStore.ts',
      ],
    },
  },
});
