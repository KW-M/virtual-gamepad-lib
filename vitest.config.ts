/// <reference types="vitest" />

import path from 'path';
import { defineConfig } from 'vite';

// eslint-disable-next-line import/no-default-export -- by design
export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['**/*.test.ts'],
        // setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    },
});
