import tailwindcss from '@tailwindcss/vite'
import { guideRoutes } from './shared/data/guides'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  modules: ['@nuxt/fonts', '@nuxtjs/mdc'],
  mdc: {
    headings: { anchorLinks: { h2: true, h3: true } },
    highlight: false,
    components: { prose: true },
  },
  fonts: {
    provider: 'google',
    defaults: {
      formats: ['woff2'],
      styles: ['normal'],
      subsets: ['latin'],
      weights: [400, 500, 700],
    },
    families: [
      { name: 'DM Sans', weights: [400, 500, 700], preload: true },
      { name: 'Manrope', weights: [400, 500, 700], preload: true },
    ],
  },
  css: ['~/assets/main.css'],
  vite: { plugins: [tailwindcss()] },
  nitro: {
    preset: 'cloudflare-module',
    prerender: { routes: ['/guides', '/meetings', '/join', ...guideRoutes] },
  },
  runtimeConfig: {
    supabaseServiceRoleKey: '',
    sheetsSyncToken: '',
    meetingAdminPin: '',
    meetingAdminSessionSecret: '',
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: 'https://matrixfellows.com',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en', class: 'bg-ink [color-scheme:dark]' },
      bodyAttrs: { class: 'bg-ink' },
      title: 'Matrix Fellows | Student Research Society at Martin HS',
      meta: [
        {
          name: 'description',
          content:
            'Explore research at Martin High School with Matrix Fellows. Find collaborators, science fair opportunities, workshops, and support for your next project.',
        },
        { name: 'theme-color', content: '#101413' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { property: 'og:title', content: 'Matrix Fellows — Beyond what we know.' },
        {
          property: 'og:description',
          content: 'A research society connecting questions, people, and possibilities.',
        },
        { property: 'og:type', content: 'website' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=matrix-mark-2' }],
      script: [
        {
          key: 'arrival-first-paint',
          innerHTML: "document.documentElement.classList.add('has-js')",
          tagPosition: 'head',
        },
      ],
    },
  },
})
