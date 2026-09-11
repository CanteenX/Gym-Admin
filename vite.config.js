import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        // 3000 is taken by the Next.js marketing site (gym-frontend).
        port: 5173,
        open: true,
    },
    build: {
        outDir: 'build',
        sourcemap: false,
    },
    esbuild: {
        jsx: 'automatic',
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    define: {
        'process.env': {},
    },
    css: {
        preprocessorOptions: {
            scss: {
                // Silence all deprecation warnings for Bootstrap and other dependencies
                // that still use legacy @import syntax and other deprecated features
                silenceDeprecations: [
                    'import',               // @import rule deprecation
                    'global-builtin',       // Global built-in functions
                    'legacy-js-api',        // Legacy JS API
                    'color-functions',      // lighten(), darken(), etc.
                    'slash-div',            // Using / for division
                    'mixed-decls',          // Mixed declarations
                    'if-function',          // @if function deprecation
                ],
                quietDeps: true,            // Suppress warnings from dependencies
            },
        },
    },
});
