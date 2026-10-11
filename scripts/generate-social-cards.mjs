import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const outputDir = join(process.cwd(), 'public/og')
mkdirSync(outputDir, { recursive: true })

const cards = {
  home: {
    eyebrow: 'MATRIX FELLOWS',
    title: ['Beyond what', 'we know.'],
    subtitle: 'Independent minds. Shared horizons.',
    footer: 'Research begins with a question.',
  },
  opportunities: {
    eyebrow: 'MATRIX FELLOWS · OPPORTUNITIES',
    title: ['Find your next', 'opening.'],
    subtitle: 'Vetted routes, useful dates, and evidence for the next step.',
    footer: 'Research opportunities · matrixfellows.com/opportunities',
  },
  login: {
    eyebrow: 'MATRIX FELLOWS · ACCESS',
    title: ['Welcome to', 'Matrix.'],
    subtitle: 'Sign in, keep moving, and return to the work that matters.',
    footer: 'Secure member access · matrixfellows.com/login',
  },
  dashboard: {
    eyebrow: 'MATRIX FELLOWS · WORKSPACE',
    title: ['Your research', 'workspace.'],
    subtitle: 'Plan the next meaningful step with evidence, opportunities, and outreach.',
    footer: 'Private workspace · matrixfellows.com/dashboard',
  },
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function cardSvg({ eyebrow, title, subtitle, footer }) {
  const [lineOne, lineTwo] = title.map(escapeXml)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1113"/><stop offset="0.62" stop-color="#10151b"/><stop offset="1" stop-color="#1b1520"/>
    </linearGradient>
    <radialGradient id="halo" cx="76%" cy="48%" r="46%">
      <stop offset="0" stop-color="#f6bd72" stop-opacity=".72"/><stop offset=".18" stop-color="#df6d2d" stop-opacity=".34"/><stop offset=".55" stop-color="#8f3e36" stop-opacity=".12"/><stop offset="1" stop-color="#151724" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#d87843" stop-opacity="0"/><stop offset=".5" stop-color="#edbd80" stop-opacity=".33"/><stop offset="1" stop-color="#d87843" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5d18e"/><stop offset=".45" stop-color="#e98743"/><stop offset="1" stop-color="#74364a"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
    <pattern id="grain" width="130" height="130" patternUnits="userSpaceOnUse"><circle cx="12" cy="31" r=".8" fill="#fff" opacity=".16"/><circle cx="88" cy="102" r=".7" fill="#fff" opacity=".12"/><circle cx="117" cy="47" r=".5" fill="#fff" opacity=".1"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>
  <g opacity=".5" filter="url(#blur)"><ellipse cx="942" cy="334" rx="238" ry="54" fill="#db6b35" transform="rotate(-14 942 334)"/><ellipse cx="945" cy="336" rx="178" ry="33" fill="#f2bd74" transform="rotate(19 945 336)"/></g>
  <g opacity=".42"><path d="M640 500 1170 36" stroke="url(#beam)" stroke-width="3"/><path d="M560 170c182 122 391 136 635 37" fill="none" stroke="#d8986d" stroke-opacity=".28" stroke-width="2"/><path d="M608 470c160-89 328-112 556-27" fill="none" stroke="#f1c986" stroke-opacity=".24" stroke-width="2"/></g>
  <g><circle cx="963" cy="318" r="67" fill="#0a0d11" fill-opacity=".93"/><circle cx="963" cy="318" r="76" fill="none" stroke="url(#rim)" stroke-width="5" opacity=".8"/><circle cx="963" cy="318" r="88" fill="none" stroke="#eea55e" stroke-width="2" opacity=".18"/></g>
  <g fill="#f4f1e9"><circle cx="102" cy="91" r="2.5" fill="#eac279"/><path d="M80 81 96 95 113 76 126 91" fill="none" stroke="#eac279" stroke-width="2"/><text x="145" y="88" font-family="Manrope,Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="4">MATRIX FELLOWS</text><text x="145" y="113" fill="#9da4ad" font-family="DM Sans,Arial,sans-serif" font-size="13" letter-spacing="2">RESEARCH SOCIETY</text></g>
  <g font-family="Manrope,Arial,sans-serif"><text x="72" y="210" fill="#eac279" font-size="12" letter-spacing="3.2">${escapeXml(eyebrow)}</text><text x="72" y="310" fill="#f4f1e9" font-size="74" font-weight="500" letter-spacing="-3">${lineOne}</text><text x="72" y="386" fill="#f0d39c" font-size="74" font-weight="500" letter-spacing="-3">${lineTwo}</text><text x="76" y="438" fill="#b1b5bd" font-family="DM Sans,Arial,sans-serif" font-size="21">${escapeXml(subtitle)}</text></g>
  <path d="M72 544h1056" stroke="#f4f1e9" stroke-opacity=".14"/><text x="72" y="578" fill="#aeb3bb" font-family="DM Sans,Arial,sans-serif" font-size="14" letter-spacing=".6">${escapeXml(footer)}</text><text x="1128" y="578" text-anchor="end" fill="#eac279" font-family="DM Sans,Arial,sans-serif" font-size="14">matrixfellows.com</text>
  <rect width="1200" height="630" fill="url(#grain)" opacity=".28"/>
</svg>`
}

for (const [name, copy] of Object.entries(cards)) {
  const svgPath = join(outputDir, `${name}.svg`)
  const pngPath = join(outputDir, `${name}.png`)
  writeFileSync(svgPath, cardSvg(copy))
  execFileSync('convert', ['-background', 'none', svgPath, '-resize', '1200x630!', pngPath])
}

// Keep the legacy home asset used by existing links and caches in sync.
execFileSync('cp', [join(outputDir, 'home.png'), join(process.cwd(), 'public/social-card.png')])
execFileSync('cp', [join(outputDir, 'home.svg'), join(process.cwd(), 'public/social-card.svg')])
