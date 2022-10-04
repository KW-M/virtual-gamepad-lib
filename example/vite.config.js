// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'



export default defineConfig({
    root: 'example',
    build: {
        // target: 'es2016',
        outDir: 'dist',
        emptyOutDir: true,
        // rollupOptions: {}
    },
})
