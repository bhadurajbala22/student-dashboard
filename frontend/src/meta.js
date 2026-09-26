import { useEffect, useState } from 'react'
import { api } from './api'

let cache = null
let inflight = null

export function useMeta() {
  const [meta, setMeta] = useState(cache)
  useEffect(() => {
    if (cache) return
    inflight = inflight || api.get('/meta')
    inflight.then(d => { cache = d; setMeta(d) }).catch(() => {})
  }, [])
  return meta
}

export const EMPTY_CATALOG = {
  subject_groups: {}, all_subjects: [], optional_subjects: [], services: {}, service_keys: [],
  session_tags: [], mentor_categories: {}, employment_statuses: [], services_allocated: [],
  preparation_stages: [], languages: [], qualifications: [], dispute_reasons: [],
  day_names: [], exam_years: [], sla_choices: [24, 48, 72], commission_rate: 0.15,
  escrow_hours: 72, vault_stream_days: 7,
}

export const useCatalog = () => useMeta()?.catalog || EMPTY_CATALOG
