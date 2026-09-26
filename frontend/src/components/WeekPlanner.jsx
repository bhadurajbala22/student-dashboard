import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DAY_SHORT } from '../format'
import { Icon } from './icons'
import { Button } from './ui'

const START_HOUR = 5
const END_HOUR = 24               // exclusive — last cell is 23:00–24:00
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

const key = (d, h) => `${d}-${h}`
const hhmm = (h) => `${String(h).padStart(2, '0')}:00`
const pretty = (h) => `${(h % 12) || 12}${h >= 12 && h < 24 ? 'p' : 'a'}`

/** slots [{day_of_week,start_time,end_time}] → Set("dow-hour") */
export function slotsToCells(slots = []) {
  const set = new Set()
  slots.forEach(s => {
    const from = parseInt(s.start_time.slice(0, 2), 10)
    const to = parseInt(s.end_time.slice(0, 2), 10)
    for (let h = from; h < to; h++) set.add(key(s.day_of_week, h))
  })
  return set
}

/** Set("dow-hour") → contiguous windows the API understands */
export function cellsToSlots(cells) {
  const out = []
  for (let d = 0; d < 7; d++) {
    let run = null
    for (const h of [...HOURS, END_HOUR]) {
      const on = cells.has(key(d, h))
      if (on && run === null) run = h
      if (!on && run !== null) {
        out.push({ day_of_week: d, start_time: hhmm(run), end_time: hhmm(h) })
        run = null
      }
    }
  }
  return out
}

export default function WeekPlanner({ cells, onChange, compact }) {
  const [drag, setDrag] = useState(null)     // { mode: 'add'|'remove' }
  const containerRef = useRef(null)

  const apply = useCallback((d, h, mode) => {
    const next = new Set(cells)
    if (mode === 'add') next.add(key(d, h))
    else next.delete(key(d, h))
    onChange(next)
  }, [cells, onChange])

  useEffect(() => {
    const up = () => setDrag(null)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up) }
  }, [])

  const start = (d, h) => {
    const mode = cells.has(key(d, h)) ? 'remove' : 'add'
    setDrag({ mode })
    apply(d, h, mode)
  }

  const over = (d, h) => { if (drag) apply(d, h, drag.mode) }

  const rowTotal = useMemo(() => {
    const t = Array(7).fill(0)
    cells.forEach(c => { const [d] = c.split('-').map(Number); t[d] += 1 })
    return t
  }, [cells])

  const setRow = (d, on) => {
    const next = new Set(cells)
    HOURS.forEach(h => on ? next.add(key(d, h)) : next.delete(key(d, h)))
    onChange(next)
  }

  const preset = (days, from, to) => {
    const next = new Set(cells)
    days.forEach(d => { for (let h = from; h < to; h++) next.add(key(d, h)) })
    onChange(next)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-400">
          Quick fill
        </span>
        <Button size="sm" variant="outline" onClick={() => preset([0, 1, 2, 3, 4], 18, 21)}>Weekday evenings</Button>
        <Button size="sm" variant="outline" onClick={() => preset([0, 1, 2, 3, 4], 6, 8)}>Early mornings</Button>
        <Button size="sm" variant="outline" onClick={() => preset([0, 1, 2, 3, 4], 21, 23)}>Late nights</Button>
        <Button size="sm" variant="outline" onClick={() => preset([5, 6], 9, 13)}>Weekend mornings</Button>
        {cells.size > 0 && (
          <Button size="sm" variant="ghost" className="!text-nex-600"
            onClick={() => onChange(new Set())}>Clear all</Button>
        )}
      </div>

      <div ref={containerRef}
        className="overflow-x-auto rounded-2xl border border-ink-200 bg-white p-3 select-none">
        <div className="min-w-[640px]">
          {/* hour ruler */}
          <div className="flex items-end gap-1 pl-[68px]">
            {HOURS.map(h => (
              <div key={h} className="flex-1 text-center text-[9px] font-bold text-ink-400">
                {h % 2 === 1 ? pretty(h) : ''}
              </div>
            ))}
          </div>

          {DAY_SHORT.map((label, d) => {
            const weekend = d >= 5
            return (
              <div key={label} className="mt-1 flex items-center gap-1">
                <button onClick={() => setRow(d, rowTotal[d] === 0)}
                  className={`focusable tap flex w-[64px] shrink-0 items-center justify-between rounded-lg px-2 py-2.5 text-left transition hover:bg-ink-100 ${weekend ? 'text-gold-700' : 'text-ink-700'}`}
                  title={rowTotal[d] ? 'Clear this day' : 'Select the whole day'}>
                  <span className="text-[11.5px] font-extrabold">{label}</span>
                  {rowTotal[d] > 0 && (
                    <span className="text-[9.5px] font-bold text-ink-400 tnum">{rowTotal[d]}h</span>
                  )}
                </button>
                {HOURS.map(h => {
                  const on = cells.has(key(d, h))
                  return (
                    <button key={h}
                      onMouseDown={(e) => { e.preventDefault(); start(d, h) }}
                      onMouseEnter={() => over(d, h)}
                      onTouchStart={(e) => { e.preventDefault(); start(d, h) }}
                      aria-label={`${label} ${hhmm(h)}`}
                      className={`planner-cell h-7 flex-1 rounded-[5px] transition-colors ${on
                        ? (weekend ? 'bg-gold-400 hover:bg-gold-500' : 'bg-nex-500 hover:bg-nex-600')
                        : 'bg-ink-100 hover:bg-ink-200'}`} />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {!compact && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-ink-500">
          <Icon.Info size={13} /> Click and drag to paint the hours you are available. Tap a day
          label to fill or clear the whole row. Bright red is a weekday, deep red a weekend.
        </p>
      )}
    </div>
  )
}
