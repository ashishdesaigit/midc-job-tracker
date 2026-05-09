import { useState } from 'react'
import { useInsightsData, getMonthOptions } from '../hooks/useInsightsData'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  tealTrack: '#E1F5EE', tealFill: '#0F6E56',
  amberTrack: '#FAEEDA', amberFill: '#633806',
  greenFill: '#16a34a', greenTrack: '#dcfce7',
  redFill: '#dc2626', redTrack: '#fef2f2',
  text2: '#555', text3: '#888', border: '#eee',
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', border: `0.5px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', ...style }}>
      {children}
    </div>
  )
}

function Label({ children }) {
  return <p style={{ fontSize: 12, fontWeight: 500, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>{children}</p>
}

function BigNum({ children, color = '#111' }) {
  return <p style={{ fontSize: 24, fontWeight: 500, color, margin: '0 0 4px' }}>{children}</p>
}

function Insight({ children }) {
  return <p style={{ fontSize: 13, fontStyle: 'italic', color: C.text2, margin: '10px 0 0', lineHeight: 1.5 }}>{children}</p>
}

function Bar({ pct, fillColor, trackColor }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: trackColor, marginTop: 4 }}>
      <div style={{ height: 8, borderRadius: 4, background: fillColor, width: `${Math.max(2, pct)}%`, transition: 'width 0.3s' }} />
    </div>
  )
}

function PulseLine({ w = '60%', h = 16 }) {
  return <div className="animate-pulse bg-gray-200 rounded" style={{ width: w, height: h, marginBottom: 8 }} />
}

function SectionSkeleton() {
  return (
    <Card>
      <PulseLine w="40%" h={12} />
      <PulseLine w="25%" h={28} />
      <PulseLine w="55%" h={12} />
      <PulseLine w="100%" h={8} />
      <PulseLine w="80%" h={8} />
    </Card>
  )
}

// ── Arrow indicator ───────────────────────────────────────────────────────────
function Arrow({ current, prev }) {
  if (prev === null || current === null) return null
  if (current < prev) return <span style={{ color: '#16a34a', fontSize: 13 }}>↓ faster than last month ({prev}d)</span>
  if (current > prev) return <span style={{ color: '#dc2626', fontSize: 13 }}>↑ slower than last month ({prev}d)</span>
  return <span style={{ color: C.text3, fontSize: 13 }}>— same as last month</span>
}

// ── Vendor reliability color ──────────────────────────────────────────────────
function vendorColor(pct) {
  if (pct >= 85) return { fill: C.greenFill, track: C.greenTrack }
  if (pct >= 70) return { fill: C.amberFill, track: C.amberTrack }
  return { fill: C.redFill, track: C.redTrack }
}

// ── Sections ──────────────────────────────────────────────────────────────────
function CycleTimeSection({ d }) {
  return (
    <Card>
      <Label>Job Cycle Time</Label>
      {d.current === null
        ? <p style={{ fontSize: 14, color: C.text3 }}>No dispatched jobs this month.</p>
        : <>
            <BigNum>Average completion: {d.current} days</BigNum>
            <Arrow current={d.current} prev={d.prev} />
          </>
      }
    </Card>
  )
}

function StageTimeSection({ stages, totalJobs }) {
  if (totalJobs < 3) {
    return (
      <Card>
        <Label>Stage-wise Time</Label>
        <p style={{ fontSize: 13, color: C.text3 }}>More data needed — this section will populate after more jobs are completed.</p>
      </Card>
    )
  }
  if (!stages?.length) return null
  const maxAvg = stages[0].avg
  return (
    <Card>
      <Label>Stage-wise Time Analysis</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map((s, i) => {
          const isLongest = i === 0
          const fillColor = isLongest ? C.amberFill : C.tealFill
          const trackColor = isLongest ? C.amberTrack : C.tealTrack
          return (
            <div key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 13, fontWeight: isLongest ? 600 : 400, color: isLongest ? C.amberFill : '#111' }}>{s.name}</span>
                <span style={{ fontSize: 13, color: isLongest ? C.amberFill : C.text2 }}>{s.avg}d avg</span>
              </div>
              <Bar pct={(s.avg / maxAvg) * 100} fillColor={fillColor} trackColor={trackColor} />
              {isLongest && (
                <p style={{ fontSize: 12, color: C.amberFill, marginTop: 4 }}>
                  This stage takes the longest — consider reviewing this operation
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function VendorSection({ vendors }) {
  if (!vendors?.length) return (
    <Card>
      <Label>Vendor Reliability</Label>
      <p style={{ fontSize: 13, color: C.text3 }}>No vendor data for this month.</p>
    </Card>
  )
  const worst = vendors[0]
  const allGreen = vendors.every(v => v.onTimePct >= 85)
  return (
    <Card>
      <Label>Vendor Reliability</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {vendors.map(v => {
          const { fill, track } = vendorColor(v.onTimePct)
          return (
            <div key={v.id}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>{v.name}</p>
              <p style={{ fontSize: 12, color: C.text2, margin: '0 0 4px' }}>
                On time: {v.onTimePct}%&nbsp;&nbsp;|&nbsp;&nbsp;Avg delay: {v.avgDelay}d&nbsp;&nbsp;|&nbsp;&nbsp;{v.total} job{v.total !== 1 ? 's' : ''}
              </p>
              <Bar pct={v.onTimePct} fillColor={fill} trackColor={track} />
            </div>
          )
        })}
      </div>
      <Insight>
        {allGreen
          ? 'All vendors are performing well this month.'
          : worst.onTimePct < 70
            ? `Consider following up earlier with ${worst.name} — consistently delayed.`
            : `${worst.name} has the lowest on-time rate this month.`}
      </Insight>
    </Card>
  )
}

function DeliverySection({ d }) {
  if (d.onTimePct === null) return (
    <Card>
      <Label>Delivery Performance</Label>
      <p style={{ fontSize: 13, color: C.text3 }}>No dispatches with due dates this month.</p>
    </Card>
  )
  const color = d.onTimePct >= 80 ? C.greenFill : d.onTimePct >= 60 ? C.amberFill : C.redFill
  const worstCust = d.byCustomer[0]
  return (
    <Card>
      <Label>Delivery Performance</Label>
      <BigNum color={color}>{d.onTimePct}% deliveries on time</BigNum>
      {d.byCustomer.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.byCustomer.map(c => (
            <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#111' }}>{c.name}</span>
              <span style={{ fontSize: 12, color: c.pct < 60 ? C.redFill : C.text2 }}>
                {c.onTime}/{c.total} on time — {c.pct}%
              </span>
            </div>
          ))}
        </div>
      )}
      <Insight>
        {d.onTimePct >= 80
          ? 'Strong delivery performance this month.'
          : worstCust?.pct < 60
            ? `${worstCust.name} has the most delayed deliveries — review their job priorities.`
            : 'Delivery performance needs improvement this month.'}
      </Insight>
    </Card>
  )
}

function SpendSection({ d }) {
  if (!d) return (
    <Card>
      <Label>Subcontract Spend</Label>
      <p style={{ fontSize: 13, color: C.text3 }}>No subcontract spend data for this month.</p>
    </Card>
  )
  return (
    <Card>
      <Label>Subcontract Spend</Label>
      <BigNum>₹{d.total.toLocaleString('en-IN')}</BigNum>
      <p style={{ fontSize: 12, color: C.text3, margin: '0 0 12px' }}>Total subcontract spend</p>

      {d.topVendors.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.text2, margin: '0 0 8px' }}>Top vendors</p>
          {d.topVendors.map(v => (
            <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{v.name}</span>
              <span style={{ color: C.text2 }}>₹{v.spend.toLocaleString('en-IN')} — {v.pct}%</span>
            </div>
          ))}
        </>
      )}

      {d.topOps.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.text2, margin: '12px 0 8px' }}>Top operations</p>
          {d.topOps.map(o => (
            <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span style={{ textTransform: 'capitalize' }}>{o.name}</span>
              <span style={{ color: C.text2 }}>₹{o.spend.toLocaleString('en-IN')}</span>
            </div>
          ))}
          {d.topOps[0] && (
            <Insight>{d.topOps[0].name.charAt(0).toUpperCase() + d.topOps[0].name.slice(1)} accounts for the largest share of your subcontract spend.</Insight>
          )}
        </>
      )}
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Insights() {
  const months  = getMonthOptions()
  const [selIdx, setSelIdx] = useState(0)
  const sel     = months[selIdx]
  const { data, loading } = useInsightsData(sel.year, sel.month)

  const noData = !loading && data && data.totalJobs < 5

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", background: '#f9f9f9', minHeight: '100svh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '48px 16px 0', borderBottom: `0.5px solid ${C.border}` }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px' }}>Insights</h1>
        {/* Month selector */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {months.map((m, i) => (
            <button key={m.label} onClick={() => setSelIdx(i)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: selIdx === i ? '#111' : '#f0f0f0',
                color: selIdx === i ? '#fff' : '#555',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <>
            <SectionSkeleton /><SectionSkeleton /><SectionSkeleton />
          </>
        ) : noData ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontSize: 16, fontWeight: 500, margin: '0 0 8px' }}>Not enough data yet</p>
            <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, margin: 0 }}>
              Insights will appear once more jobs are completed. Keep updating job stages daily — this screen fills up automatically.
            </p>
          </div>
        ) : (
          <>
            <CycleTimeSection     d={data.cycleTime} />
            <StageTimeSection     stages={data.stageTime} totalJobs={data.totalJobs} />
            <VendorSection        vendors={data.vendorReliability} />
            <DeliverySection      d={data.deliveryPerformance} />
            <SpendSection         d={data.subcontractSpend} />
          </>
        )}
      </div>
    </div>
  )
}
