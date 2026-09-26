import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { fetchBytes } from '../api'
import { Icon } from './icons'
import { Button, Spinner } from './ui'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/* Marks are stored normalised 0..1 against the page box, so a stroke drawn on
   a phone lands in exactly the same place on a desktop and survives zooming. */
export const TOOLS = [
  { key: 'pen', label: 'Pen', icon: Icon.Pencil, hint: 'Circle and correct' },
  { key: 'highlight', label: 'Highlight', icon: Icon.Marker, hint: 'Mark a good line' },
  { key: 'strike', label: 'Strike', icon: Icon.Strike, hint: 'Cut what does not earn marks' },
  { key: 'text', label: 'Note', icon: Icon.Note, hint: 'Write in the margin' },
  { key: 'erase', label: 'Erase', icon: Icon.Eraser, hint: 'Remove a mark' },
]

export const COLORS = ['#dc1f26', '#1a1515', '#0f7b52', '#b45309', '#1d4ed8']

const uid = () => Math.random().toString(36).slice(2, 10)

function drawMark(ctx, m, W, H) {
  const pts = (m.points || []).map(([x, y]) => [x * W, y * H])
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (m.kind === 'text') {
    const x = (m.x ?? 0) * W, y = (m.y ?? 0) * H
    const pad = 7, size = Math.max(11, (m.size || 3) * 4.2)
    ctx.font = `600 ${size}px -apple-system, "Plus Jakarta Sans", sans-serif`
    const lines = String(m.text || '').split('\n').slice(0, 8)
    const wMax = Math.max(60, ...lines.map(l => ctx.measureText(l).width))
    const boxH = lines.length * size * 1.35 + pad * 2
    ctx.fillStyle = 'rgba(255,255,255,.94)'
    ctx.strokeStyle = m.color
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(x, y, wMax + pad * 2, boxH, 8)
    ctx.fill(); ctx.stroke()
    // a small leader so the note clearly belongs to the line beside it
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x - 10, y + 4); ctx.stroke()
    ctx.fillStyle = m.color
    lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + size * (i + 0.95)))
    ctx.restore()
    return
  }

  if (!pts.length) { ctx.restore(); return }
  ctx.strokeStyle = m.color
  if (m.kind === 'highlight') {
    ctx.globalAlpha = 0.28
    ctx.lineWidth = (m.size || 3) * 6
  } else if (m.kind === 'strike') {
    ctx.lineWidth = Math.max(2, (m.size || 3) * 0.8)
  } else {
    ctx.lineWidth = m.size || 3
  }
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  if (m.kind === 'strike' && pts.length > 1) {
    const last = pts[pts.length - 1]
    ctx.lineTo(last[0], last[1])          // strike is always a straight rule
  } else {
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * Renders a PDF page and lets a mentor mark on it — circling, highlighting,
 * striking through and writing margin notes, the way a copy is actually
 * checked on paper. Read-only for the aspirant, and live-pollable so the
 * marks appear as they are drawn during a shared review.
 */
export default function CopyAnnotator({
  filePath, value = [], onChange, readOnly = false, tool = 'pen', color = COLORS[0],
  size = 3, page, onPageCount, onPageChange, className = '', liveHint,
}) {
  const wrapRef = useRef(null)
  const pdfCanvas = useRef(null)
  const inkCanvas = useRef(null)
  const pdfRef = useRef(null)
  const renderTask = useRef(null)
  const drawing = useRef(null)

  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [note, setNote] = useState(null)      // { x, y } while typing a margin note

  const current = page || 1

  /* ── load the document once ─────────────────────────────────────── */
  useEffect(() => {
    let dead = false
    let task = null
    setLoading(true); setError('')
    ;(async () => {
      try {
        const bytes = await fetchBytes(filePath)
        if (dead) return
        task = pdfjs.getDocument({ data: bytes })
        const doc = await task.promise
        if (dead) return
        pdfRef.current = doc
        setPages(doc.numPages)
        onPageCount?.(doc.numPages)
        setLoading(false)
      } catch (e) {
        if (dead) return
        setError(e?.message || 'Could not open this PDF')
        setLoading(false)
      }
    })()
    return () => { dead = true; task?.destroy?.() }
  }, [filePath])

  /* ── render the current page at the container width ─────────────── */
  const renderPage = useCallback(async () => {
    const doc = pdfRef.current
    const wrap = wrapRef.current
    if (!doc || !wrap) return
    const pageObj = await doc.getPage(Math.min(current, doc.numPages))
    const unscaled = pageObj.getViewport({ scale: 1 })
    const avail = wrap.clientWidth || 600
    const scale = avail / unscaled.width
    const viewport = pageObj.getViewport({ scale })
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const c = pdfCanvas.current
    c.width = Math.floor(viewport.width * dpr)
    c.height = Math.floor(viewport.height * dpr)
    c.style.width = `${viewport.width}px`
    c.style.height = `${viewport.height}px`

    const ink = inkCanvas.current
    ink.width = c.width; ink.height = c.height
    ink.style.width = c.style.width; ink.style.height = c.style.height

    setBox({ w: viewport.width, h: viewport.height })

    renderTask.current?.cancel?.()
    const ctx = c.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewport.width, viewport.height)
    renderTask.current = pageObj.render({ canvasContext: ctx, viewport })
    try { await renderTask.current.promise } catch { /* cancelled on resize */ }
  }, [current])

  useLayoutEffect(() => { if (!loading && !error) renderPage() }, [loading, error, renderPage])

  useEffect(() => {
    if (loading) return
    let t
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(renderPage, 120) })
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => { clearTimeout(t); ro.disconnect() }
  }, [loading, renderPage])

  /* ── repaint the ink layer whenever marks or size change ────────── */
  useEffect(() => {
    const ink = inkCanvas.current
    if (!ink || !box.w) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ctx = ink.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, box.w, box.h)
    for (const m of value) {
      if ((m.page || 1) !== current) continue
      drawMark(ctx, m, box.w, box.h)
    }
    const live = drawing.current
    if (live && (live.page || 1) === current) drawMark(ctx, live, box.w, box.h)
  }, [value, box, current])

  /* ── pointer handling ───────────────────────────────────────────── */
  const norm = (e) => {
    const r = inkCanvas.current.getBoundingClientRect()
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ]
  }

  const paint = () => {
    const ink = inkCanvas.current
    if (!ink || !box.w) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ctx = ink.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, box.w, box.h)
    for (const m of value) if ((m.page || 1) === current) drawMark(ctx, m, box.w, box.h)
    if (drawing.current) drawMark(ctx, drawing.current, box.w, box.h)
  }

  const hitTest = ([x, y]) => {
    // nearest mark on this page within a small radius
    let best = null, bestD = 0.035
    for (const m of value) {
      if ((m.page || 1) !== current) continue
      const pts = m.kind === 'text' ? [[m.x ?? 0, m.y ?? 0]] : (m.points || [])
      for (const [px, py] of pts) {
        const d = Math.hypot(px - x, py - y)
        if (d < bestD) { bestD = d; best = m }
      }
    }
    return best
  }

  const down = (e) => {
    if (readOnly) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = norm(e)

    if (tool === 'erase') {
      const hit = hitTest(p)
      if (hit) onChange(value.filter(m => m !== hit))
      return
    }
    if (tool === 'text') { setNote({ x: p[0], y: p[1], text: '' }); return }

    drawing.current = {
      id: uid(), page: current, kind: tool, color,
      size: tool === 'highlight' ? 3 : size,
      points: [p], at: new Date().toISOString(),
    }
    paint()
  }

  const move = (e) => {
    if (readOnly || !drawing.current) return
    const p = norm(e)
    const pts = drawing.current.points
    const last = pts[pts.length - 1]
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.002) return
    pts.push(p)
    paint()
  }

  const up = () => {
    if (readOnly || !drawing.current) return
    const m = drawing.current
    drawing.current = null
    if (m.points.length > 1 || m.kind === 'text') onChange([...value, m])
    else paint()
  }

  const commitNote = (text) => {
    if (text.trim()) {
      onChange([...value, {
        id: uid(), page: current, kind: 'text', color, size,
        x: note.x, y: note.y, text: text.trim(), at: new Date().toISOString(),
      }])
    }
    setNote(null)
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={wrapRef} className="relative mx-auto w-full">
        {loading && (
          <div className="flex h-72 items-center justify-center gap-2.5 rounded-2xl bg-ink-50 text-ink-400">
            <Spinner /><span className="text-[13px] font-bold">Opening the copy…</span>
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-nex-200 bg-nex-50 p-6 text-center">
            <Icon.Alert size={22} className="mx-auto text-nex-600" />
            <p className="mt-2 text-[13px] font-bold text-nex-900">Could not open this PDF</p>
            <p className="mt-1 text-[12px] text-nex-800">{error}</p>
          </div>
        )}
        <div className={`relative ${loading || error ? 'hidden' : ''}`}>
          <canvas ref={pdfCanvas} className="block w-full rounded-xl bg-white shadow-sm" />
          <canvas
            ref={inkCanvas}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
            className={`absolute inset-0 rounded-xl ${readOnly ? '' : 'cursor-crosshair touch-none'}`}
            style={{ touchAction: readOnly ? 'auto' : 'none' }}
          />
          {note && (
            <NoteComposer note={note} box={box} color={color}
              onCancel={() => setNote(null)} onSave={commitNote} />
          )}
          {readOnly && liveHint && (
            <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/85 px-2.5 py-1 text-[10.5px] font-extrabold text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-nex-400 a-breathe" />{liveHint}
            </span>
          )}
        </div>
      </div>

      {pages > 1 && !loading && !error && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={current <= 1}
            onClick={() => onPageChange?.(current - 1)} aria-label="Previous page">
            <Icon.Chevron size={15} className="rotate-180" />
          </Button>
          <span className="min-w-24 text-center text-[12.5px] font-extrabold text-ink-700 tnum">
            Page {current} of {pages}
          </span>
          <Button size="sm" variant="outline" disabled={current >= pages}
            onClick={() => onPageChange?.(current + 1)} aria-label="Next page">
            <Icon.Chevron size={15} />
          </Button>
        </div>
      )}
    </div>
  )
}

function NoteComposer({ note, box, color, onCancel, onSave }) {
  const [text, setText] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const left = Math.min(note.x * box.w, Math.max(0, box.w - 230))
  const top = Math.min(note.y * box.h, Math.max(0, box.h - 130))
  return (
    <div className="absolute z-10 w-[230px] rounded-xl border-2 bg-white p-2 shadow-xl"
      style={{ left, top, borderColor: color }}>
      <textarea ref={ref} rows={3} value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave(text)
        }}
        placeholder="Write in the margin…"
        className="w-full resize-none rounded-lg bg-ink-50 p-2 text-[12px] outline-none" />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-ink-400">⌘↵ to place</span>
        <div className="flex gap-1.5">
          <Button size="xs" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="xs" onClick={() => onSave(text)}>Place</Button>
        </div>
      </div>
    </div>
  )
}
