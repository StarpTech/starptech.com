import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    site: 'https://starptech.com',
    compressHTML: true,
    prefetch: { defaultStrategy: 'viewport' },
    integrations: [sitemap()],
    build: { inlineStylesheets: 'auto' },
    vite: {
        // @resvg/resvg-js ships a native .node binding that Vite/esbuild
        // can't bundle — keep it external so it's required at runtime.
        ssr: { external: ['@resvg/resvg-js'] },
        optimizeDeps: { exclude: ['@resvg/resvg-js'] },
    },
    markdown: {
        shikiConfig: {
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
            wrap: false,
        },
    },
});
