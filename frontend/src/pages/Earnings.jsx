import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { EscrowChip, SERVICE_ICON } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Badge, Bar, Button, Card, Empty, Loading, SectionHead, Segmented, Stat,
} from '../components/ui'
import { countdown, inr, relative, shortStamp } from '../format'
import { useCatalog } from '../meta'

const KIND_META = {
  captured: { label: 'Captured into escrow', tone: 'gold', icon: Icon.Lock },
  delivered: { label: 'Delivered — clock started', tone: 'nex', icon: Icon.Check },
  released: { label: 'Released to you', tone: 'mint', icon: Icon.Wallet },
  refunded: { label: 'Refunded to aspirant', tone: 'ink', icon: Icon.Refresh },
  frozen: { label: 'Frozen — dispute', tone: 'rose', icon: Icon.Scale },
  liquidated: { label: 'Liquidated — expired credits', tone: 'violet', icon: Icon.Package },
}

export default function Earnings() {
  const cat = useCatalog()
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('all')

  useEffect(() => { api.get('/earnings').then(setD) }, [])
  if (!d) return <Loading label="Loading your ledger" />

  const b = d.balances
  const entries = tab === 'all' ? d.ledger : d.ledger.filter(e => e.kind === tab)
  const maxService = Math.max(1, ...Object.values(d.by_service || {}))

  return (
    <div className="a-rise">
      <div className="mb-5">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">Earnings</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">
          Every rupee is captured into escrow first and released {cat.escrow_hours} hours after
          delivery, or the moment the aspirant approves. Platform fee is{' '}
          {Math.round(d.commission_rate * 100)}%.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid out" value={inr(b.released)} tone="emerald"
          hint="lifetime, after platform fee" icon={<Icon.Wallet size={13} />} />
        <Stat label="In escrow" value={inr(b.in_escrow)} tone="amber"
          hint={`${b.clearing_count} orders clearing within 24h`} icon={<Icon.Lock size={13} />} />
        <Stat label="Clearing in 24h" value={inr(b.clearing_24h)} tone="indigo"
          hint="no action needed" icon={<Icon.Clock size={13} />} />
        <Stat label="Frozen" value={inr(b.frozen)} tone="violet"
          hint="held pending dispute review" icon={<Icon.Scale size={13} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div>
          <SectionHead icon={<Icon.Trend size={16} className="text-ink-400" />}
            hint="Every escrow state change, newest first">
            Ledger
          </SectionHead>

          <Segmented className="mb-4" value={tab} onChange={setTab} options={[
            { value: 'all', label: 'All', count: d.ledger.length },
            ...Object.keys(KIND_META)
              .filter(k => d.ledger.some(e => e.kind === k))
              .map(k => ({ value: k, label: KIND_META[k].label.split(' ')[0],
                count: d.ledger.filter(e => e.kind === k).length })),
          ]} />

          {entries.length === 0 ? (
            <Empty compact icon={<Icon.Wallet size={20} />} title="No entries yet"
              hint="Your first captured order will appear here." />
          ) : (
            <div className="space-y-2">
              {entries.map(e => {
                const m = KIND_META[e.kind] || KIND_META.captured
                return (
                  <Card key={e.id} pad="p-3.5">
                    <div className="flex items-start gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${m.tone === 'mint' ? 'bg-mint-50 text-mint-600'
                        : m.tone === 'gold' ? 'bg-gold-50 text-gold-600'
                          : m.tone === 'rose' ? 'bg-nex-50 text-nex-600'
                            : m.tone === 'violet' ? 'bg-gold-50 text-gold-600'
                              : m.tone === 'nex' ? 'bg-nex-50 text-nex-600' : 'bg-ink-100 text-ink-500'}`}>
                        <m.icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12.5px] font-extrabold text-ink-900">{m.label}</p>
                          <span className="font-mono text-[10.5px] text-ink-400">{e.reference}</span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-ink-500">
                          {cat.services?.[e.service_kind]?.short} · {e.student} · {relative(e.created_at)}
                        </p>
                        {e.note && <p className="mt-1 text-[11px] text-ink-400">{e.note}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        {e.kind === 'released' || e.kind === 'liquidated' ? (
                          <>
                            <p className="text-[14px] font-extrabold text-mint-600 tnum">+{inr(e.payout)}</p>
                            <p className="text-[10px] text-ink-400 tnum">fee {inr(e.commission)}</p>
                          </>
                        ) : e.kind === 'refunded' ? (
                          <p className="text-[14px] font-extrabold text-ink-400 tnum">−{inr(e.amount)}</p>
                        ) : e.amount ? (
                          <p className="text-[14px] font-extrabold text-ink-700 tnum">{inr(e.amount)}</p>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <SectionHead icon={<Icon.Package size={15} className="text-ink-400" />}>
              Paid out by service
            </SectionHead>
            {Object.keys(d.by_service || {}).length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-ink-400">Nothing released yet.</p>
            ) : (
              <div className="space-y-3.5">
                {Object.entries(d.by_service).map(([kind, total]) => {
                  const I = SERVICE_ICON[kind]
                  return (
                    <div key={kind}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink-700">
                          <I size={13} className="text-ink-400" />
                          {cat.services?.[kind]?.short || kind}
                        </span>
                        <span className="text-[13px] font-extrabold text-ink-900 tnum">{inr(total)}</span>
                      </div>
                      <Bar className="mt-1.5" value={total} max={maxService} tone="mint" />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <SectionHead icon={<Icon.Clock size={15} className="text-ink-400" />}
              hint="Awaiting the aspirant's review window">
              Pending release
            </SectionHead>
            {d.pending_release.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-ink-400">Nothing in the window.</p>
            ) : (
              <div className="space-y-2.5">
                {d.pending_release.map(o => (
                  <div key={o.id} className="rounded-xl border border-ink-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-extrabold text-ink-900">{o.title}</p>
                        <p className="text-[11px] text-ink-500">
                          {o.student?.name} · <span className="font-mono">{o.reference}</span>
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-extrabold text-ink-900 tnum">
                        {inr(o.mentor_payout)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <EscrowChip state={o.escrow_state} hours={o.hours_to_release} />
                      <span className="text-[10.5px] font-semibold text-ink-400">
                        {o.hours_to_release > 0 ? `auto-releases in ${countdown(o.hours_to_release)}` : 'releasing'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card pad="p-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              Lifetime summary
            </p>
            <div className="mt-3 space-y-2 text-[12.5px]">
              {[
                ['Gross billed', inr(b.lifetime_gross)],
                [`Platform fee (${Math.round(d.commission_rate * 100)}%)`, `− ${inr(b.commission_paid)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-ink-500">{k}</span>
                  <span className="font-extrabold text-ink-900 tnum">{v}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-ink-200 pt-2.5">
                <span className="font-extrabold text-ink-900">Net received</span>
                <span className="text-[17px] font-extrabold text-mint-600 tnum">{inr(b.released)}</span>
              </div>
            </div>
          </Card>

          <Alert tone="nex" icon={<Icon.Info size={16} />} title="Payout schedule">
            Funds leave escrow {cat.escrow_hours} hours after you mark a service delivered, unless
            the aspirant approves sooner or raises an issue. Settlements land in the bank account
            verified during onboarding.
          </Alert>
        </div>
      </div>
    </div>
  )
}
