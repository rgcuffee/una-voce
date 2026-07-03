import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: {
    cwd(): string
}

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'una-voce-local-functions',
            configureServer(server) {
                server.middlewares.use(
                    '/.netlify/functions/cathoholic-videos',
                    async (request, response) => {
                        try {
                            const requestPath =
                                (request as { url?: string }).url ?? ''
                            const date =
                                requestPath.match(/[?&]date=([^&]+)/)?.[1]
                            const functionModulePath = `file://${process.cwd()}/netlify/functions/lib/cathoholic-videos.mjs`
                            const { cathoholicVideosResponse } = await import(
                                functionModulePath
                            )
                            const body = await cathoholicVideosResponse(
                                date ? decodeURIComponent(date) : null,
                            )

                            response.statusCode = 200
                            response.setHeader(
                                'content-type',
                                'application/json',
                            )
                            response.end(JSON.stringify(body))
                        } catch (error) {
                            response.statusCode = 502
                            response.setHeader(
                                'content-type',
                                'application/json',
                            )
                            response.end(
                                JSON.stringify({
                                    ok: false,
                                    error:
                                        error instanceof Error
                                            ? error.message
                                            : 'Unable to load Cathoholic videos',
                                }),
                            )
                        }
                    },
                )
            },
        },
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'Una Voce – The Church at Prayer',
                short_name: 'Una Voce',
                description: 'Pray the Liturgy of the Hours with communities around the world.',
                theme_color: '#1C1C1E',
                background_color: '#FAFAF8',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'unsplash-images-cache',
                            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
})
