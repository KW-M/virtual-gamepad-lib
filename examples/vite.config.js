// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// resolve: {
//     'virtual-gamepad-lib/*': {
//         src: "../src/*",
//         },
// },
// "compilerOptions": {
//     "paths": {
//         "virtual-gamepad-lib/*": [
//             "../src/*"
//         ]
//     }
// }

export default defineConfig({
    root: 'examples',
    base: '/virtual-gamepad-lib/',
    build: {
        target: 'es2016',
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                simple: resolve(__dirname, 'simple/index.html'),
                keyboard: resolve(__dirname, 'keyboard/index.html'),
                game_engine: resolve(__dirname, 'game_engine/index.html'),
                multiple_gamepads: resolve(__dirname, 'multiple_gamepads/index.html')
            }
        }
    },
})
