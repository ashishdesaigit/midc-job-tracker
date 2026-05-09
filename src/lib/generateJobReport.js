// Generates a print-ready HTML document for a completed job.
// Opens in a new tab — user prints to PDF or physical paper.

function fmt(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', opts)
}

function days(from, to) {
  if (!from || !to) return null
  const d = (new Date(to) - new Date(from)) / 86400000
  return Math.round(d * 10) / 10
}

function badge(text, color) {
  const map = {
    green:  { bg: '#dcfce7', fg: '#16a34a' },
    amber:  { bg: '#fef3c7', fg: '#92400e' },
    red:    { bg: '#fee2e2', fg: '#dc2626' },
    blue:   { bg: '#dbeafe', fg: '#1e40af' },
    gray:   { bg: '#f3f4f6', fg: '#374151' },
  }
  const c = map[color] ?? map.gray
  return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${c.bg};color:${c.fg};">${text}</span>`
}

function stageTimes(logs, dispatchDate) {
  if (!logs?.length) return []
  const sorted = [...logs].sort((a, b) => new Date(a.moved_at) - new Date(b.moved_at))
  const result = []
  for (let i = 0; i < sorted.length; i++) {
    const nextTime = i < sorted.length - 1 ? sorted[i + 1].moved_at : dispatchDate
    if (!nextTime) continue
    const d = days(sorted[i].moved_at, nextTime)
    if (d !== null && d >= 0) result.push({ stage: sorted[i].stage_name, d })
  }
  return result
}

export function generateJobReport({ job, unit, stageLog, subcontracts, dispatches, comments }) {
  const lastDispatch = [...(dispatches ?? [])].sort((a, b) =>
    new Date(b.dispatch_date) - new Date(a.dispatch_date))[0]

  const totalDays  = days(job.created_at, lastDispatch?.dispatch_date)
  const stages     = stageTimes(stageLog, lastDispatch?.dispatch_date)
  const maxStageD  = stages.length ? Math.max(...stages.map(s => s.d)) : 1
  const rejections = (subcontracts ?? []).filter(s => (s.qty_rejected ?? 0) > 0)
  const totalQtyDispatched = (dispatches ?? []).reduce((s, d) => s + d.qty_dispatched, 0)
  const totalValue = job.rate ? totalQtyDispatched * job.rate : null

  const generatedAt = new Date().toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff;font-size:13px}
    @page{size:A4;margin:18mm 20mm}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    /* Header */
    .report-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid #2563EB;margin-bottom:20px}
    .logo-area{display:flex;align-items:center;gap:10px}
    .logo-box{width:36px;height:36px;background:#2563EB;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;flex-shrink:0}
    .logo-text{font-size:18px;font-weight:700;color:#2563EB}
    .logo-sub{font-size:11px;color:#666;margin-top:1px}
    .unit-block{text-align:right;font-size:11px;color:#555;line-height:1.6}
    .unit-block .unit-name{font-size:13px;font-weight:600;color:#1a1a1a}
    /* Section */
    .section{margin-bottom:20px}
    .section-title{font-size:10px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
    /* Grid */
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 28px}
    .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 20px}
    .field .lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:1px}
    .field .val{font-size:13px;font-weight:500;color:#1a1a1a}
    /* Highlight box */
    .highlight{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;display:flex;gap:32px;margin-bottom:20px}
    .highlight .big{font-size:28px;font-weight:700;color:#1e40af;line-height:1}
    .highlight .lbl{font-size:10px;color:#60a5fa;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px}
    /* Table */
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f8faff;padding:6px 10px;text-align:left;font-size:10px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e5e7eb}
    td{padding:8px 10px;border-bottom:0.5px solid #f3f4f6;vertical-align:top}
    tr:last-child td{border-bottom:none}
    .tr-alt{background:#fafafa}
    /* Stage bar */
    .bar-track{height:6px;background:#e5e7eb;border-radius:3px;margin-top:4px;overflow:hidden}
    .bar-fill{height:6px;border-radius:3px;background:#2563EB}
    .bar-fill.longest{background:#d97706}
    /* Comment */
    .comment-box{background:#f9fafb;border-left:3px solid #d1d5db;padding:6px 10px;border-radius:0 4px 4px 0;margin-bottom:4px}
    .comment-meta{font-size:10px;color:#9ca3af;margin-bottom:2px}
    /* Footer */
    .report-footer{margin-top:28px;padding-top:10px;border-top:0.5px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
  `

  // ── Sections ──────────────────────────────────────────────────────────────

  const jobDetailsSection = `
    <div class="section">
      <div class="section-title">Job Details</div>
      <div class="grid2">
        <div class="field"><div class="lbl">Job Number</div><div class="val">${job.job_number}</div></div>
        <div class="field"><div class="lbl">Customer</div><div class="val">${job.customers?.name ?? '—'}</div></div>
        <div class="field"><div class="lbl">Part Name</div><div class="val">${job.part_name}</div></div>
        <div class="field"><div class="lbl">Material</div><div class="val">${job.material ?? '—'}</div></div>
        <div class="field"><div class="lbl">Qty Ordered</div><div class="val">${job.qty_ordered} pcs</div></div>
        <div class="field"><div class="lbl">Qty Dispatched</div><div class="val">${totalQtyDispatched} pcs</div></div>
        ${job.rate ? `<div class="field"><div class="lbl">Rate</div><div class="val">₹${job.rate}/${job.rate_unit}</div></div>` : ''}
        ${totalValue ? `<div class="field"><div class="lbl">Total Value</div><div class="val" style="color:#1e40af;font-weight:700;">₹${totalValue.toLocaleString('en-IN')}</div></div>` : ''}
        <div class="field"><div class="lbl">Due Date</div><div class="val">${fmt(job.due_date)}</div></div>
        <div class="field"><div class="lbl">Dispatch Date</div><div class="val">${fmt(lastDispatch?.dispatch_date)}</div></div>
        ${lastDispatch?.vehicle_info ? `<div class="field"><div class="lbl">Vehicle</div><div class="val">${lastDispatch.vehicle_info}</div></div>` : ''}
        ${job.remarks ? `<div class="field" style="grid-column:1/-1"><div class="lbl">Remarks</div><div class="val">${job.remarks}</div></div>` : ''}
      </div>
    </div>`

  const deliveryStatus = (() => {
    if (!job.due_date || !lastDispatch?.dispatch_date) return ''
    const d = days(job.due_date, lastDispatch.dispatch_date)
    if (d === null) return ''
    if (d <= 0) return badge(`On time (${Math.abs(d)}d early)`, 'green')
    return badge(`${d}d late`, 'red')
  })()

  const timelineSection = `
    <div class="highlight">
      <div>
        <div class="big">${totalDays ?? '—'}</div>
        <div class="lbl">Total days</div>
      </div>
      <div style="border-left:1px solid #bfdbfe;padding-left:24px;">
        <div class="lbl" style="margin-bottom:4px;">Created</div>
        <div style="font-weight:500">${fmt(job.created_at)}</div>
      </div>
      <div>
        <div class="lbl" style="margin-bottom:4px;">Dispatched</div>
        <div style="font-weight:500">${fmt(lastDispatch?.dispatch_date)}</div>
      </div>
      ${deliveryStatus ? `<div style="margin-left:auto;align-self:center;">${deliveryStatus}</div>` : ''}
    </div>`

  const stageSection = stages.length ? `
    <div class="section">
      <div class="section-title">Stage-wise Time Breakdown</div>
      <table>
        <thead><tr><th>Stage</th><th>Time spent</th><th style="width:40%">Visual</th></tr></thead>
        <tbody>
          ${stages.map((s, i) => {
            const isLongest = s.d === maxStageD && s.d > 0
            const pct = maxStageD > 0 ? (s.d / maxStageD * 100).toFixed(0) : 0
            return `<tr class="${i % 2 ? 'tr-alt' : ''}">
              <td style="font-weight:${isLongest ? '600' : '400'};color:${isLongest ? '#d97706' : '#1a1a1a'}">${s.stage}${isLongest ? ' ★' : ''}</td>
              <td style="font-weight:500">${s.d}d</td>
              <td><div class="bar-track"><div class="bar-fill ${isLongest ? 'longest' : ''}" style="width:${pct}%"></div></div></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
      ${stages.length ? `<p style="font-size:10px;color:#9ca3af;margin-top:6px;">★ Longest stage</p>` : ''}
    </div>` : ''

  const vendorSection = subcontracts?.length ? `
    <div class="section">
      <div class="section-title">Vendor / Subcontract Details</div>
      <table>
        <thead><tr><th>Challan</th><th>Vendor</th><th>Stage</th><th>Operation</th><th>Qty</th><th>Rate</th><th>Sent</th><th>Returned</th><th>Status</th></tr></thead>
        <tbody>
          ${subcontracts.map((s, i) => {
            const statusColor = s.status === 'returned' ? 'green' : s.status === 'partial' ? 'amber' : 'blue'
            return `<tr class="${i % 2 ? 'tr-alt' : ''}">
              <td style="font-family:monospace;font-size:11px">${s.challan_ref}</td>
              <td style="font-weight:500">${s.vendors?.name ?? '—'}</td>
              <td style="font-size:11px;color:#6b7280">${s.stage_name ?? '—'}</td>
              <td style="font-size:11px">${s.operation_desc ?? '—'}</td>
              <td>${s.qty_sent} pcs</td>
              <td>${s.rate_per_piece ? `₹${s.rate_per_piece}/pc` : '—'}</td>
              <td style="font-size:11px">${fmt(s.sent_date)}</td>
              <td style="font-size:11px">${fmt(s.actual_return_date)}</td>
              <td>${badge(s.status === 'returned' ? 'Returned' : s.status === 'partial' ? 'Partial' : 'Pending', statusColor)}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>` : ''

  const rejectionSection = rejections.length ? `
    <div class="section">
      <div class="section-title" style="color:#dc2626">Rejections / Quality Issues</div>
      <table>
        <thead><tr><th>Challan</th><th>Vendor</th><th>Qty Sent</th><th>Qty Rejected</th><th>Reason</th></tr></thead>
        <tbody>
          ${rejections.map((s, i) => `
            <tr class="${i % 2 ? 'tr-alt' : ''}">
              <td style="font-family:monospace;font-size:11px">${s.challan_ref}</td>
              <td style="font-weight:500">${s.vendors?.name ?? '—'}</td>
              <td>${s.qty_sent} pcs</td>
              <td style="color:#dc2626;font-weight:600">${s.qty_rejected} pcs</td>
              <td style="font-size:11px;color:#555">${s.rejection_note ?? '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''

  const commentsSection = comments?.length ? `
    <div class="section">
      <div class="section-title">Activity Log</div>
      ${comments.map(c => `
        <div class="comment-box">
          <div class="comment-meta">${c.stage_name ?? ''} · ${c.users?.name ?? 'User'} · ${fmt(c.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          <div style="font-size:12px">${c.comment ?? ''}</div>
        </div>`).join('')}
    </div>` : ''

  const dispatchSection = (dispatches?.length ?? 0) > 1 ? `
    <div class="section">
      <div class="section-title">Dispatch Records</div>
      <table>
        <thead><tr><th>DC Number</th><th>Date</th><th>Qty</th><th>Vehicle</th></tr></thead>
        <tbody>
          ${dispatches.map((d, i) => `
            <tr class="${i % 2 ? 'tr-alt' : ''}">
              <td style="font-family:monospace;font-size:11px">${d.dc_number}</td>
              <td>${fmt(d.dispatch_date)}</td>
              <td>${d.qty_dispatched} pcs</td>
              <td style="font-size:11px;color:#555">${d.vehicle_info ?? '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''

  // ── Full document ─────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Job Report — ${job.job_number}</title>
  <style>${css}</style>
</head>
<body>
  <div class="page">
    <!-- Report header -->
    <div class="report-header">
      <div class="logo-area">
        <div class="logo-box">J</div>
        <div>
          <div class="logo-text">JobTrack</div>
          <div class="logo-sub">Job Completion Report</div>
        </div>
      </div>
      <div class="unit-block">
        <div class="unit-name">${unit?.name ?? ''}</div>
        ${unit?.address ? `<div>${unit.address}</div>` : ''}
        ${unit?.gstin ? `<div>GSTIN: ${unit.gstin}</div>` : ''}
        <div style="margin-top:4px;color:#9ca3af">Generated: ${generatedAt}</div>
      </div>
    </div>

    ${timelineSection}
    ${jobDetailsSection}
    ${stageSection}
    ${vendorSection}
    ${rejectionSection}
    ${dispatchSection}
    ${commentsSection}

    <div class="report-footer">
      <span>JobTrack · Job Completion Report</span>
      <span>${job.job_number} · ${unit?.name ?? ''}</span>
    </div>
  </div>
</body>
</html>`
}
