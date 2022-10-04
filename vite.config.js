// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'



export default defineConfig({
    build: {
        target: 'es2016',
        lib: {
            entry: resolve(__dirname, 'src/main.ts'),
            name: 'VirtualGamepad',
            // the proper extensions will be added
            fileName: (format) => `virtual-gamepad.${format}.js`
        },
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: [],
            output: [{
                dir: 'dist',
                format: 'es',
                preserveModules: true,
                entryFileNames: '[name].js',
                // Provide global variables to use in the UMD build
                // for externalized deps
                globals: {}
            }],
        },
        sourcemap: true
    },

    plugins: [dts()]
})
