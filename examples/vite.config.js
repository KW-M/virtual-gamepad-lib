// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'



export default defineConfig({
    root: 'examples',
    build: {
        target: 'es2016',
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                full: resolve(__dirname, 'full/index.html'),
                simple: resolve(__dirname, 'simple/index.html'),
                game_engine: resolve(__dirname, 'game_engine/index.html')
            }
        }
    },
})
