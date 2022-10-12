// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'


/** @type {import('vite').UserConfig} */
export default defineConfig({
    build: {
        target: 'modules',
        lib: {
            formats: ['es', 'cjs'],
            entry: {
                'index': resolve(__dirname, 'src/index.ts'),
                'enums': resolve(__dirname, 'src/enums.ts'),
                'utilities': resolve(__dirname, 'src/utilities.ts'),
                'GamepadApiWrapper': resolve(__dirname, 'src/GamepadApiWrapper.ts'),
                'GamepadDisplay': resolve(__dirname, 'src/GamepadDisplay.ts'),
                'GamepadEmulator': resolve(__dirname, 'src/GamepadEmulator.ts'),
            },
            name: 'VirtualGamepad',
            // the proper extensions will be added
            fileName: (format, entryName) => `${format != "es" ? format + "/" : ""}${entryName}.js`
        },

        sourcemap: true
    },

    plugins: [dts()]
})
