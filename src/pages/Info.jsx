import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Brand tokens ──────────────────────────────────────────────────────────────
const TEAL      = '#1D9E75'
const TEAL_10   = 'rgba(29,158,117,0.1)'
const TEXT_SEC  = '#555'
const TEXT_TERT = '#888'
const BORDER_LT = '#eeeeee'
const BORDER    = '#e0e0e0'

// ── Icons ─────────────────────────────────────────────────────────────────────
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke={TEAL} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
)

const WAIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={TEAL}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.5l5.81-1.523A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.025-1.384l-.36-.214-3.735.979 1-3.64-.235-.374A9.818 9.818 0 1112 21.818z" />
  </svg>
)

function Screenshot({ src, alt, caption }) {
  const [err, setErr] = useState(false)
  return (
    <div>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        {!err
          ? <img src={src} alt={alt} style={{ width: '100%', display: 'block' }} onError={() => setErr(true)} />
          : <div style={{ background: '#f5f5f5', aspectRatio: '9/16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: TEXT_TERT, textAlign: 'center', padding: 16 }}>Screenshot coming soon</p>
            </div>
        }
      </div>
      {caption && <p style={{ fontSize: 13, color: TEXT_SEC, textAlign: 'center', marginTop: 8 }}>{caption}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Info() {
  const navigate = useNavigate()
  const [canScrollLeft, setCanScrollLeft]   = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  function onScroll(e) {
    const el = e.currentTarget
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  function scrollBy(dir) {
    const el = document.getElementById('screenshot-scroll')
    if (!el) return
    const itemW = el.clientWidth * 0.85 + 12
    el.scrollBy({ left: dir * itemW, behavior: 'smooth' })
  }

  useEffect(() => {
    const setMeta = (prop, content, isName = false) => {
      const attr = isName ? 'name' : 'property'
      let el = document.querySelector(`meta[${attr}="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    document.title = 'JobTrack — Job tracking made simple'
    setMeta('og:title',       'JobTrack — Job tracking made simple')
    setMeta('og:description', 'All your jobs. One screen. Know what\'s happening on the floor — without going there.')
    setMeta('og:image',       window.location.origin + '/screenshots/dashboard.png')
    setMeta('og:url',         window.location.origin + '/info')
    setMeta('og:type',        'website')
    setMeta('twitter:card',   'summary_large_image', true)
    return () => { document.title = 'JobTrack' }
  }, [])

  const sec = (extra = {}) => ({ padding: '40px 16px', borderTop: `0.5px solid ${BORDER_LT}`, ...extra })

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", color: '#111', background: '#fff', maxWidth: 640, margin: '0 auto', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── Hero + Problems ──────────────────────────────────────────────────── */}
      <section style={{ padding: '48px 16px 40px' }}>
        <p style={{ fontSize: 12, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 500, margin: 0 }}>
          For foundries and machine shops
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.25, margin: '12px 0 0' }}>
          All your jobs.<br /><span style={{ color: TEAL }}>One screen.</span>
        </h1>
        <p style={{ fontSize: 16, color: TEXT_SEC, marginTop: 12, lineHeight: 1.6 }}>
          Most owners spend their day chasing job status updates they shouldn't have to chase.
        </p>

        {/* Problem points — compact, no cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {[
            { heading: 'You call your supervisor multiple times a day', body: 'Customer asks for delivery status. You have to call the floor to find out.' },
            { heading: 'Jobs get stuck at vendors — silently', body: 'Material went to a vendor 8 days ago. Nobody followed up. Delivery is now late.' },
            { heading: 'Month end numbers are always approximate', body: 'How many pieces were produced? How many rejected? How much is payable to vendors? You have to call three people to get one answer.' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fafafa', border: `0.5px solid ${BORDER_LT}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: TEAL, marginTop: 6, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 3px' }}>{c.heading}</p>
                <p style={{ fontSize: 13, color: TEXT_SEC, margin: 0, lineHeight: 1.5 }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bridge */}
        <div style={{ marginTop: 28, background: 'rgba(29,158,117,0.07)', borderLeft: `3px solid ${TEAL}`, borderRadius: '0 10px 10px 0', padding: '14px 16px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: 0, lineHeight: 1.5 }}>
            If any of this sounds familiar, JobTrack is built for your unit.
          </p>
        </div>

        <p style={{ fontSize: 12, color: TEXT_TERT, marginTop: 20 }}>
          No credit card. No app to install. Works on any Android or iPhone.
        </p>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={sec()}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>How it works</h2>
        <p style={{ fontSize: 14, color: TEXT_SEC, margin: '0 0 28px' }}>Two people. Two simple roles. Your supervisor spends <strong style={{ color: '#111' }}>10 minutes a day</strong>. You see everything.</p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            {
              num: '01', pill: <>Supervisor · <strong>10 min/day</strong></>,
              heading: 'Updates job status',
              body: <>Creates job cards when orders come in. Moves jobs through stages as work progresses. Adds comments and photos when needed. Works like sending a WhatsApp message — no training required. <strong style={{ color: '#111' }}>Total time: 10 minutes a day.</strong></>,
            },
            {
              num: '02', pill: 'Owner · 0 min/day',
              heading: 'Sees everything live',
              body: 'Opens the app on his phone from anywhere. Sees every active job, every stage, which jobs are overdue, what is stuck at which vendor. No calls. No follow-up. Just clarity — even when you are 200km away.',
            },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: i < arr.length - 1 ? 32 : 0, position: 'relative' }}>
              {i < arr.length - 1 && (
                <div style={{ position: 'absolute', left: 19, top: 44, bottom: 0, width: 1, background: BORDER_LT }} />
              )}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: TEAL_10, border: `1.5px solid ${TEAL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>{s.num}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: TEAL, background: TEAL_10, borderRadius: 20, padding: '3px 10px', display: 'inline-block', marginBottom: 8 }}>{s.pill}</span>
                <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 6px' }}>{s.heading}</p>
                <p style={{ fontSize: 14, color: TEXT_SEC, margin: 0, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

{/* ── Screenshots ─────────────────────────────────────────────────────── */}
<section style={{ ...sec(), paddingRight: 0, paddingLeft: 0 }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 16 }}>
    <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>See it in action</h2>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => scrollBy(-1)} disabled={!canScrollLeft}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${canScrollLeft ? TEAL : BORDER}`, background: '#fff', cursor: canScrollLeft ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={canScrollLeft ? TEAL : BORDER} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button onClick={() => scrollBy(1)} disabled={!canScrollRight}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${canScrollRight ? TEAL : BORDER}`, background: '#fff', cursor: canScrollRight ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={canScrollRight ? TEAL : BORDER} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  </div>

  <div id="screenshot-scroll" onScroll={onScroll} style={{
    display: 'flex', overflowX: 'auto', gap: 12,
    padding: '0 16px 16px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
  }}>
    <style>{`#screenshot-scroll::-webkit-scrollbar { display: none; }`}</style>
    {[
      { src: '/screenshots/dashboard.png',      cap: 'Owner dashboard' },
      { src: '/screenshots/job-list.png',        cap: 'Job list' },
      { src: '/screenshots/outside-jobs.png',    cap: 'Vendor tracking' },
      { src: '/screenshots/job-detail.png',      cap: 'Job detail' },
      { src: '/screenshots/insight.png',         cap: 'Insights' },
      { src: '/screenshots/comments.png',        cap: 'Comments' },
      { src: '/screenshots/vendor-followup.png', cap: 'Vendor follow-up' },
    ].map((img, i) => (
      <div key={i} style={{ width: '80%', flexShrink: 0, scrollSnapAlign: 'center' }}>
        <Screenshot src={img.src} alt={img.cap} caption={img.cap} />
      </div>
    ))}
  </div>
</section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section style={sec()}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 20px' }}>Everything your unit needs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'End-to-end job tracking',    desc: 'From order received to delivery dispatched. Every stage logged.' },
            { label: 'Subcontract management',      desc: 'Track every job at every vendor. Quantity sent, expected return, overdue alerts.' },
            { label: 'One-tap WhatsApp follow-up',  desc: 'Pre-filled messages to vendors. You just hit send.' },
            { label: 'Photo and comment log',       desc: 'Attach photos and notes at every stage. Complete quality trail per job.' },
            { label: 'Delivery challan generation', desc: 'Generated automatically. Shared on WhatsApp in two taps.' },
            { label: 'Insights dashboard',          desc: 'Cycle times, vendor reliability, delivery performance. Built from your own data.' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fafafa', border: `0.5px solid ${BORDER_LT}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: TEAL_10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{f.label}</p>
                <p style={{ fontSize: 12, color: TEXT_SEC, margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ ...sec({ borderBottom: `0.5px solid ${BORDER_LT}` }), textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 8px' }}>Want a demo at your unit?</h2>
        <p style={{ fontSize: 14, color: TEXT_SEC, margin: '0 0 24px' }}>We will come to you — no charge.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <a href="tel:+919730350766"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEAL, fontSize: 14, textDecoration: 'none' }}>
            <PhoneIcon /> +91 97303 50766
          </a>
          <a href="https://wa.me/919730350766?text=Hi%2C%20I%27d%20like%20a%20demo%20of%20JobTrack"
            target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEAL, fontSize: 14, textDecoration: 'none' }}>
            <WAIcon /> WhatsApp us
          </a>
        </div>
        <div style={{ marginTop: 32 }}>
          <button onClick={() => navigate('/login')}
            style={{ height: 44, background: TEAL, color: '#fff', border: 'none', borderRadius: 8, padding: '0 32px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Get started
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `0.5px solid ${BORDER_LT}`, padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>JobTrack</span>
          <span style={{ fontSize: 12, color: TEXT_TERT }}>Built for MIDC manufacturing units</span>
        </div>
      </footer>

    </div>
  )
}
