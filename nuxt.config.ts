import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  vite: { plugins: [tailwindcss()] },
  nitro: { preset: 'cloudflare-module' },
  runtimeConfig: {
    supabaseServiceRoleKey: '',
    sheetsSyncToken: '',
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      siteUrl: 'http://localhost:3000',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en', class: 'bg-ink [color-scheme:dark]' },
      bodyAttrs: { class: 'bg-ink' },
      title: 'Matrix Fellows — The next question starts with you.',
      meta: [
        {
          name: 'description',
          content:
            'A student-founded research society for curious minds. Explore ideas, find collaborators, and take your first step into scientific research.',
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
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=matrix-mark-2' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Manrope:wght@400;500;600;650;700;750;800&display=swap',
        },
      ],
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
