import { defineConfig } from 'vite';

export default defineConfig({
    base: '/trusted-traveler-appointment-checker/',
    build: {
        outDir: '../docs',
        emptyOutDir: true,
    },
    root: 'web',
});
