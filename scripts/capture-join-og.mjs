import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'
const output = new URL('../public/og/join.png', import.meta.url)
await mkdir(new URL('../public/og/', import.meta.url), { recursive: true })

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.goto(`${base}/join`, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    document.body.innerHTML = `
      <main class="og-frame">
        <div class="og-stars"></div>
        <div class="og-orbit"><i></i></div>
        <section class="og-copy">
          <div class="og-brand">
            <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 28C23 15 45 7 54 13M57 24C49 39 22 58 9 51C5 49 5 45 8 41"/><path d="M17 46V22L32 37L47 22V46"/><circle cx="56" cy="17" r="2.2"/></svg>
            <span><small>Matrix</small>Fellows</span>
          </div>
          <p class="og-kicker"><i></i> Martin High School Research Society</p>
          <h1>Bring your question.<strong>We’ll help you move it forward.</strong></h1>
          <p class="og-summary">A student community for turning curiosity into projects, papers, competitions, and real experience.</p>
        </section>
        <section class="og-panel" aria-hidden="true">
          <header>
            <span class="og-mini-mark">M</span>
            <span>Become a fellow</span>
          </header>
          <div class="og-progress"><i></i><i></i><i></i><i></i></div>
          <p>01 / 04 · Introduce yourself</p>
          <h2>A name behind the curiosity.</h2>
          <div class="og-field"><span>Student full name</span></div>
          <div class="og-field"><span>Student email</span></div>
          <button>Continue <b>↗</b></button>
        </section>
      </main>`
  })
  await page.addStyleTag({
    content: `
      *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#101413;color:#f4f1e9}.og-frame{--violet:#c5c0eb;position:relative;width:1200px;height:630px;overflow:hidden;padding:54px 58px;font-family:'DM Sans',sans-serif;background:radial-gradient(780px 520px at 88% 0%,rgba(100,88,148,.21),transparent 68%),radial-gradient(580px 430px at -7% 93%,rgba(49,119,112,.14),transparent 72%),#101413}.og-stars{position:absolute;inset:0;opacity:.5;background-image:radial-gradient(circle at 31% 18%,rgba(255,255,255,.38) 0 .8px,transparent 1.2px),radial-gradient(circle at 72% 52%,rgba(210,201,255,.3) 0 .7px,transparent 1.1px);background-size:290px 250px,370px 310px}.og-orbit{position:absolute;width:510px;height:510px;right:-180px;top:68px;border:1px solid rgba(197,192,235,.1);border-radius:50%;transform:rotate(-24deg) scaleY(.48)}.og-orbit i{position:absolute;left:-3px;top:50%;width:6px;height:6px;border-radius:50%;background:var(--violet);box-shadow:0 0 20px rgba(197,192,235,.7)}.og-copy{position:relative;width:515px}.og-brand{display:flex;align-items:center;gap:13px;font-family:Manrope,sans-serif;font-size:17px;line-height:1}.og-brand svg{width:43px;height:43px;fill:none;stroke:#d9d7dc;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.og-brand svg path:last-of-type{stroke-width:4.5}.og-brand svg circle{fill:#c5c0eb;stroke:none}.og-brand small{display:block;margin-bottom:6px;color:rgba(244,241,233,.42);font-size:9px;letter-spacing:.22em;text-transform:uppercase}.og-kicker{display:flex;align-items:center;gap:10px;margin:60px 0 19px;color:rgba(197,192,235,.7);font-size:10px;letter-spacing:.19em;text-transform:uppercase}.og-kicker i{width:6px;height:6px;border-radius:50%;background:var(--violet);box-shadow:0 0 14px rgba(197,192,235,.5)}h1{margin:0;font-family:Manrope,sans-serif;font-size:55px;font-weight:400;line-height:.98;letter-spacing:-.06em}h1 strong{display:block;font-weight:400;color:transparent;background:linear-gradient(100deg,#dce8ee,#c5c0eb 55%,#9bd8d1);background-clip:text}.og-summary{max-width:480px;margin:23px 0 0;color:rgba(244,241,233,.54);font-size:14px;line-height:1.7}.og-panel{position:absolute;right:49px;top:63px;width:560px;height:505px;padding:35px 38px;border:1px solid rgba(244,241,233,.2);border-radius:34px;background:linear-gradient(145deg,rgba(244,241,233,.075),rgba(244,241,233,.028) 48%,transparent 78%),rgba(31,34,33,.92);box-shadow:0 30px 110px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.08)}.og-panel header{display:flex;align-items:center;gap:12px;color:rgba(244,241,233,.58);font-size:10px;letter-spacing:.2em;text-transform:uppercase}.og-mini-mark{display:grid;width:27px;height:27px;place-items:center;color:var(--violet);font-family:Manrope,sans-serif;font-size:16px}.og-progress{display:flex;gap:8px;margin:26px 0}.og-progress i{display:block;height:4px;flex:1;border-radius:5px;background:rgba(244,241,233,.11)}.og-progress i:first-child{background:linear-gradient(90deg,#98ccdd,#c5c0eb)}.og-panel>p{margin:0 0 17px;color:rgba(197,192,235,.58);font-size:10px;letter-spacing:.17em;text-transform:uppercase}.og-panel h2{margin:0 0 29px;font-family:Manrope,sans-serif;font-size:31px;font-weight:400;letter-spacing:-.045em}.og-field{height:59px;margin-top:27px;border:1px solid rgba(244,241,233,.13);border-radius:13px;background:rgba(244,241,233,.018)}.og-field span{display:block;transform:translateY(-20px);color:rgba(244,241,233,.48);font-size:10px}.og-panel button{position:absolute;right:38px;bottom:31px;min-width:140px;height:50px;border:0;border-radius:999px;background:var(--violet);color:#101413;font:500 14px 'DM Sans',sans-serif}.og-panel button b{margin-left:24px;font-size:17px;font-weight:400}
    `,
  })
  await page.screenshot({ path: output.pathname, type: 'png' })
} finally {
  await browser.close()
}

console.log(`Rendered ${output.pathname} at 1200x630`)
