// ─── Tiny hash for canvas/string payloads ─────────────────────────────────
function hash32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

// ─── Canvas fingerprint ────────────────────────────────────────────────────
function canvasFingerprint() {
  try {
    const c   = document.createElement('canvas')
    c.width   = 220; c.height = 50
    const ctx = c.getContext('2d')
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle    = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.font      = '14px Arial'
    ctx.fillText('SurveyForge 🔒1', 2, 15)
    ctx.fillStyle = 'rgba(102,204,0,0.7)'
    ctx.fillText('SurveyForgggge 🔒1', 4, 17)
    return hash32(c.toDataURL())
  } catch { return 'unavailable' }
}

// ─── WebGL renderer / vendor ───────────────────────────────────────────────
function webglInfo() {
  try {
    const c  = document.createElement('canvas')
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl')
    if (!gl) return { renderer: 'none', vendor: 'none' }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'masked',
      vendor:   ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   : 'masked',
    }
  } catch { return { renderer: 'unavailable', vendor: 'unavailable' } }
}

// ─── UserAgent parsing ────────────────────────────────────────────────────
function parseBrowser(ua) {
  if (/Edg\//.test(ua))           return { name: 'Edge',    version: (ua.match(/Edg\/([\d.]+)/)    || [])[1] || '' }
  if (/OPR\/|Opera/.test(ua))     return { name: 'Opera',   version: (ua.match(/OPR\/([\d.]+)/)    || [])[1] || '' }
  if (/Chrome\//.test(ua))        return { name: 'Chrome',  version: (ua.match(/Chrome\/([\d.]+)/) || [])[1] || '' }
  if (/Firefox\//.test(ua))       return { name: 'Firefox', version: (ua.match(/Firefox\/([\d.]+)/)|| [])[1] || '' }
  if (/Safari\//.test(ua))        return { name: 'Safari',  version: (ua.match(/Version\/([\d.]+)/)|| [])[1] || '' }
  return { name: 'Unknown', version: '' }
}

function parseOS(ua) {
  if (/Windows NT 10/.test(ua))   return 'Windows 10/11'
  if (/Windows NT 6\.3/.test(ua)) return 'Windows 8.1'
  if (/Windows NT 6\.1/.test(ua)) return 'Windows 7'
  if (/Windows/.test(ua))         return 'Windows'
  if (/Mac OS X ([\d_]+)/.test(ua)) {
    const v = (ua.match(/Mac OS X ([\d_]+)/) || ['',''])[1].replace(/_/g,'.')
    return `macOS ${v}`
  }
  if (/Android ([\d.]+)/.test(ua)) return `Android ${(ua.match(/Android ([\d.]+)/)||['',''])[1]}`
  if (/iPhone|iPad/.test(ua))     return 'iOS'
  if (/Linux/.test(ua))           return 'Linux'
  return 'Unknown'
}

function parseDevice(ua) {
  if (/Mobi|Android.*Mobile|iPhone/.test(ua))           return 'Mobile'
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua))       return 'Tablet'
  return 'Desktop'
}

// ─── IP + geo via free API (with graceful timeout) ─────────────────────────
async function fetchIP(timeoutMs = 5000) {
  // Primary: ipapi.co gives IP + city + country + ISP (free ≤ 1 k/day)
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const r    = await fetch('https://ipapi.co/json/', { signal: ac.signal })
    const d    = await r.json()
    clearTimeout(timer)
    return {
      ip:          d.ip          || '',
      city:        d.city        || '',
      region:      d.region      || '',
      country:     d.country_name|| '',
      countryCode: d.country_code|| '',
      isp:         d.org         || '',
      latitude:    d.latitude    != null ? String(d.latitude)  : '',
      longitude:   d.longitude   != null ? String(d.longitude) : '',
    }
  } catch {
    clearTimeout(timer)
    // Fallback: ipify for raw IP only
    try {
      const r2 = await fetch('https://api.ipify.org?format=json',
                             { signal: AbortSignal.timeout(3000) })
      const d2 = await r2.json()
      return { ip: d2.ip || 'unavailable', city:'', region:'', country:'',
               countryCode:'', isp:'', latitude:'', longitude:'' }
    } catch {
      return { ip:'unavailable', city:'', region:'', country:'',
               countryCode:'', isp:'', latitude:'', longitude:'' }
    }
  }
}

// ─── Main collector ────────────────────────────────────────────────────────
/**
 * Collect all enabled fingerprint signals.
 * @param {object} signals  - map of signal key → boolean (true = collect)
 * @returns {Promise<object>} flat fingerprint object ready to store / export
 */
export async function collectFingerprint(signals = {}) {
  const fp  = {}
  const ua  = navigator.userAgent

  // IP + geo (async — always first so timeout doesn't delay UI)
  if (signals.ip) {
    const ipData = await fetchIP()
    Object.assign(fp, ipData)
  }

  if (signals.browser) {
    const b = parseBrowser(ua)
    fp.browserName    = b.name
    fp.browserVersion = b.version
  }

  if (signals.os)         fp.os           = parseOS(ua)
  if (signals.deviceType) fp.deviceType   = parseDevice(ua)

  if (signals.screen) {
    fp.screenW   = screen.width
    fp.screenH   = screen.height
    fp.colorDepth = screen.colorDepth
    fp.viewportW  = window.innerWidth
    fp.viewportH  = window.innerHeight
  }

  if (signals.timezone)   fp.timezone     = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (signals.language)   fp.language     = navigator.language

  if (signals.hardware) {
    fp.cpuCores    = navigator.hardwareConcurrency || 'unknown'
    fp.deviceMemGB = navigator.deviceMemory        || 'unknown'
    fp.touchPoints = navigator.maxTouchPoints
  }

  if (signals.connection) {
    const conn       = navigator.connection
    fp.connType      = conn?.effectiveType || 'unknown'
    fp.connDownlink  = conn?.downlink      || ''
  }

  if (signals.canvas) fp.canvasHash = canvasFingerprint()

  if (signals.webgl) {
    const w = webglInfo()
    fp.webglRenderer = w.renderer
    fp.webglVendor   = w.vendor
  }

  if (signals.cookies)   fp.cookiesEnabled = navigator.cookieEnabled
  if (signals.doNotTrack) fp.doNotTrack    = navigator.doNotTrack || 'unset'

  fp.fpCollectedAt = new Date().toISOString()
  fp.userAgent     = signals.userAgent ? ua : undefined

  // Remove undefined keys
  Object.keys(fp).forEach(k => fp[k] === undefined && delete fp[k])

  return fp
}

// ─── Default signal config (all keys, default values) ─────────────────────
const DEFAULT_FP_SIGNALS = {
  ip:          true,
  browser:     true,
  os:          true,
  deviceType:  true,
  screen:      true,
  timezone:    true,
  language:    true,
  hardware:    false,
  connection:  false,
  canvas:      true,
  webgl:       false,
  cookies:     false,
  doNotTrack:  false,
  userAgent:   false,
}

// ─── Column headers for CSV output ────────────────────────────────────────
// Returns an array of { key, label } pairs for all ENABLED signals
export function fpColumns(signals = DEFAULT_FP_SIGNALS) {
  const cols = []
  const add  = (key, label) => cols.push({ key, label: `FP: ${label}` })

  if (signals.ip) {
    add('ip',          'IP Address')
    add('city',        'City')
    add('region',      'Region')
    add('country',     'Country')
    add('countryCode', 'Country Code')
    add('isp',         'ISP / Org')
    add('latitude',    'Latitude')
    add('longitude',   'Longitude')
  }
  if (signals.browser) {
    add('browserName',    'Browser')
    add('browserVersion', 'Browser Version')
  }
  if (signals.os)          add('os',           'Operating System')
  if (signals.deviceType)  add('deviceType',   'Device Type')
  if (signals.screen) {
    add('screenW',    'Screen Width')
    add('screenH',    'Screen Height')
    add('colorDepth', 'Color Depth')
    add('viewportW',  'Viewport Width')
    add('viewportH',  'Viewport Height')
  }
  if (signals.timezone)    add('timezone',      'Timezone')
  if (signals.language)    add('language',      'Language')
  if (signals.hardware) {
    add('cpuCores',    'CPU Cores')
    add('deviceMemGB', 'Device Memory (GB)')
    add('touchPoints', 'Touch Points')
  }
  if (signals.connection) {
    add('connType',     'Connection Type')
    add('connDownlink', 'Downlink (Mbps)')
  }
  if (signals.canvas)      add('canvasHash',    'Canvas Fingerprint Hash')
  if (signals.webgl) {
    add('webglRenderer', 'WebGL Renderer')
    add('webglVendor',   'WebGL Vendor')
  }
  if (signals.cookies)     add('cookiesEnabled','Cookies Enabled')
  if (signals.doNotTrack)  add('doNotTrack',    'Do Not Track')
  if (signals.userAgent)   add('userAgent',     'User Agent String')

  add('fpCollectedAt', 'FP Collected At')

  return cols
}
