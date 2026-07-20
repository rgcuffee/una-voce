import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: {
    cwd(): string
    env: Record<string, string | undefined>
}

declare const Buffer: {
    concat(chunks: unknown[]): { toString(encoding: string): string }
}

declare const URL: {
    new (url: string, base?: string): {
        searchParams: { entries(): Iterable<[string, string]> }
    }
}

type LocalFunctionEvent = {
    httpMethod: string
    headers: Record<string, string>
    body: string
    queryStringParameters: Record<string, string>
    path?: string
    rawUrl?: string
}

function readRequestBody(request: {
    on(event: 'data', callback: (chunk: unknown) => void): void
    on(event: 'end', callback: () => void): void
    on(event: 'error', callback: (error: Error) => void): void
}) {
    return new Promise<string>((resolve, reject) => {
        const chunks: unknown[] = []
        request.on('data', (chunk: unknown) => chunks.push(chunk))
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        request.on('error', reject)
    })
}

function queryParams(url: string | undefined) {
    const parsed = new URL(url ?? '/', 'http://localhost')
    return Object.fromEntries(parsed.searchParams.entries())
}

function headersFrom(request: { headers?: Record<string, string | string[] | undefined> }) {
    return Object.fromEntries(
        Object.entries(request.headers ?? {}).flatMap(([key, value]) => {
            if (Array.isArray(value)) return [[key, value.join(', ')]]
            if (value === undefined) return []
            return [[key, value]]
        }),
    )
}

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'una-voce-local-functions',
            configureServer(server) {
                server.middlewares.use(
                    '/api/zoom',
                    async (request, response) => {
                        const zoomFunctions: Record<string, string> = {
                            '/test-room': 'zoom-room.mjs',
                            '/oauth/start': 'zoom-oauth-start.mjs',
                            '/oauth/callback': 'zoom-oauth-callback.mjs',
                            '/session': 'zoom-session.mjs',
                            '/meeting-signature': 'zoom-meeting-signature.mjs',
                        }
                        try {
                            const requestPath = (request as { url?: string }).url ?? '/'
                            const pathname = requestPath.split('?')[0]
                            const functionName = zoomFunctions[pathname]
                            if (!functionName) {
                                response.statusCode = 404
                                response.end(JSON.stringify({ error: 'Zoom endpoint not found' }))
                                return
                            }
                            const headers = headersFrom(
                                request as {
                                    headers?: Record<string, string | string[] | undefined>
                                },
                            )
                            const rawUrl = `http://${headers.host ?? 'localhost:5173'}/api/zoom${requestPath}`
                            const functionModulePath = `file://${process.cwd()}/netlify/functions/${functionName}?dev=${Date.now()}`
                            const { handler } = await import(functionModulePath)
                            const event: LocalFunctionEvent = {
                                httpMethod: (request as { method?: string }).method ?? 'GET',
                                headers,
                                body: (request as { method?: string }).method === 'POST'
                                    ? await readRequestBody(request as {
                                        on(event: 'data', callback: (chunk: unknown) => void): void
                                        on(event: 'end', callback: () => void): void
                                        on(event: 'error', callback: (error: Error) => void): void
                                    })
                                    : '',
                                queryStringParameters: queryParams(requestPath),
                                path: `/api/zoom${pathname}`,
                                rawUrl,
                            }
                            const result = await handler(event)
                            response.statusCode = result.statusCode
                            for (const [key, value] of Object.entries(result.headers ?? {})) {
                                response.setHeader(key, value as string)
                            }
                            for (const [key, value] of Object.entries(result.multiValueHeaders ?? {})) {
                                response.setHeader(key, value as string[])
                            }
                            response.end(result.body ?? '')
                        } catch (error) {
                            response.statusCode = 500
                            response.setHeader('content-type', 'application/json')
                            response.end(JSON.stringify({
                                error: error instanceof Error ? error.message : 'Unable to load Zoom endpoint',
                            }))
                        }
                    },
                )
                server.middlewares.use(
                    '/api/admin/partners',
                    async (request, response) => {
                        try {
                            const functionModulePath = `file://${process.cwd()}/netlify/functions/admin-partners.mjs?dev=${Date.now()}`
                            const { handler } = await import(functionModulePath)
                            const headers = headersFrom(
                                request as {
                                    headers?: Record<
                                        string,
                                        string | string[] | undefined
                                    >
                                },
                            )
                            if (
                                !headers['x-admin-secret'] &&
                                process.env.ADMIN_SHARED_SECRET
                            ) {
                                headers['x-admin-secret'] =
                                    process.env.ADMIN_SHARED_SECRET
                            }
                            const event: LocalFunctionEvent = {
                                httpMethod:
                                    (request as { method?: string }).method ??
                                    'GET',
                                headers,
                                body:
                                    (request as { method?: string }).method ===
                                    'POST'
                                        ? await readRequestBody(
                                              request as {
                                                  on(
                                                      event: 'data',
                                                      callback: (
                                                          chunk: unknown,
                                                      ) => void,
                                                  ): void
                                                  on(
                                                      event: 'end',
                                                      callback: () => void,
                                                  ): void
                                                  on(
                                                      event: 'error',
                                                      callback: (
                                                          error: Error,
                                                      ) => void,
                                                  ): void
                                              },
                                          )
                                        : '',
                                queryStringParameters: queryParams(
                                    (request as { url?: string }).url,
                                ),
                            }
                            const result = await handler(event)

                            response.statusCode = result.statusCode
                            for (const [key, value] of Object.entries(
                                result.headers ?? {},
                            )) {
                                response.setHeader(key, value as string)
                            }
                            response.end(result.body ?? '')
                        } catch (error) {
                            response.statusCode = 500
                            response.setHeader(
                                'content-type',
                                'application/json',
                            )
                            response.end(
                                JSON.stringify({
                                    error:
                                        error instanceof Error
                                            ? error.message
                                            : 'Unable to load admin data',
                                }),
                            )
                        }
                    },
                )
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
                server.middlewares.use(
                    '/.netlify/functions/worth-abbey-videos',
                    async (request, response) => {
                        try {
                            const requestPath =
                                (request as { url?: string }).url ?? ''
                            const date =
                                requestPath.match(/[?&]date=([^&]+)/)?.[1]
                            const functionModulePath = `file://${process.cwd()}/netlify/functions/lib/worth-abbey-videos.mjs`
                            const { worthAbbeyVideosResponse } = await import(
                                functionModulePath
                            )
                            const body = await worthAbbeyVideosResponse(
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
                                            : 'Unable to load Worth Abbey videos',
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
                // The Zoom Meeting SDK is loaded only after a visitor chooses to join.
                // It is intentionally not part of the app's offline precache.
                globIgnores: ['assets/embedded-*.js'],
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
