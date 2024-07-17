/// <reference types="vitest" />

import { defineConfig } from 'vitest/config'

// eslint-disable-next-line import/no-default-export -- by design
export default defineConfig({
    test: {
        browser: {
            enabled: true,
            name: 'chrome', // browser name is required
            headless: false,
        },
        include: ['**/*.test.ts'],
    },
});
