const TOKEN_KEY = 'nexus.token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message); this.status = status; this.payload = payload
  }
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, {
    method, headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  })

  if (res.status === 204) return null
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { detail: text } }

  if (!res.ok) {
    let detail = data?.detail ?? 'Something went wrong'
    if (Array.isArray(detail)) {
      detail = detail.map(d => `${(d.loc || []).slice(-1)[0]}: ${d.msg}`).join(' · ')
    }
    if (res.status === 401 && token) setToken(null)
    throw new ApiError(detail, res.status, data)
  }
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: body ?? {} }),
  put: (p, body) => request(p, { method: 'PUT', body: body ?? {} }),
  patch: (p, body) => request(p, { method: 'PATCH', body: body ?? {} }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (p, form) => request(p, { method: 'POST', form }),
}

/** Fetch a private file as bytes, with the bearer token attached.
 *  pdf.js cannot set an Authorization header on its own request, and putting
 *  the token in the query string would leak it into history and server logs —
 *  so we pull the bytes here and hand pdf.js the buffer. */
export async function fetchBytes(path) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { headers })
  if (!res.ok) {
    if (res.status === 401) setToken(null)
    throw new ApiError(
      res.status === 404 ? 'That file is no longer available'
        : res.status === 401 ? 'Your session expired — sign in again'
          : `Could not load the file (${res.status})`, res.status, null)
  }
  return new Uint8Array(await res.arrayBuffer())
}

export const fileUrl = (path) => `/api${path}`
export { ApiError }
