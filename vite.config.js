import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Public base path for the build.
 *
 * The admin SPA is served from /admin on the shared Vercel domain, so every
 * asset URL and the react-router basename must carry that prefix. main.jsx
 * already reads import.meta.env.BASE_URL, so setting base here is enough.
 *
 * Overridable because the legacy FTP/PM2 deployment serves the same build at
 * the domain root instead (Express maps out/admin to "/"); that target must
 * build with ADMIN_BASE_PATH=/ or every asset 404s.
 *
 * The override is VALIDATED because Git Bash / MSYS rewrites a POSIX-looking
 * value into a Windows path before node is started - `ADMIN_BASE_PATH=/admin/`
 * arrives as "C:/Program Files/Git/admin/". Vite accepts that happily and emits
 * <script src="/Program Files/Git/admin/assets/…">, which loads nothing and
 * renders a blank page with no build error to explain it. Anything that is not
 * a clean absolute URL path is therefore ignored rather than shipped.
 */
const ADMIN_BASE = (() => {
    const raw = process.env.ADMIN_BASE_PATH;
    if (!raw) return '/admin/';
    if (/^\/[\w.~/-]*$/.test(raw)) return raw;
    console.warn(
        `[vite] Ignoring ADMIN_BASE_PATH="${raw}": not an absolute URL path. ` +
        'On Git Bash, prefix the command with MSYS_NO_PATHCONV=1. Using /admin/.',
    );
    return '/admin/';
})();

export default defineConfig({
    plugins: [react()],
    base: ADMIN_BASE,
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
