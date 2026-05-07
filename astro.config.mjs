import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    site: 'https://starptech.com',
    compressHTML: true,
    prefetch: { defaultStrategy: 'viewport' },
    integrations: [sitemap()],
    build: { inlineStylesheets: 'auto' },
    markdown: {
        shikiConfig: {
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
            wrap: false,
        },
    },
});
