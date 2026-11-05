// SCORM 1.2 run-time API shim (window.API) that turns the package's cmi data into lesson
// analytics events:
//
//   cmi.core.lesson_status  → scorm_status { status, previous }        (on LMSCommit / LMSFinish)
//   cmi.core.score.raw/min/max → scorm_score { raw, min, max }          (on LMSCommit / LMSFinish)
//   cmi.core.session_time, cmi.core.exit → scorm_exit { exit, sessionSeconds, totalSeconds, status, raw }
//   LMSInitialize           → scorm_launch { version: '1.2', entry }
//   cmi.suspend_data        stored for resume; events only carry its length, never its content.
//
// Real packages run in a same-origin iframe and find window.API by walking up window.parent;
// installScormApi() puts the shim there. The theme's simulated module calls it directly.
// Storage is localStorage in the preview; in production `storage` should POST each commit to the
// backend (e.g. PUT /api/scorm/{enrolment}/{lesson}) so the cmi record survives devices.
//
// Follow-up: SCORM 2004 (window.API_1484_11: Initialize/GetValue/SetValue/Commit/Terminate,
// cmi.completion_status + cmi.success_status, cmi.score.scaled, ISO 8601 cmi.session_time) can sit
// on the same storage and event mapping.

import { track } from '@/lib/analytics'

const ERRORS = {
  0: 'No error',
  101: 'General exception',
  201: 'Invalid argument error',
  202: 'Element cannot have children',
  203: 'Element not an array. Cannot have count',
  301: 'Not initialized',
  401: 'Not implemented error',
  402: 'Invalid set value, element is a keyword',
  403: 'Element is read only',
  404: 'Element is write only',
  405: 'Incorrect Data Type',
}

export const LESSON_STATUSES = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted']
const EXITS = ['time-out', 'suspend', 'logout', '']
const TIMESPAN = /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/

export function parseTimespan(v) {
  if (!TIMESPAN.test(v || '')) return 0
  const [h, m, s] = v.split(':')
  return Number(h) * 3600 + Number(m) * 60 + Number(s)
}

export function formatTimespan(seconds) {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = (s % 60).toFixed(2).padStart(5, '0')
  return `${String(h).padStart(4, '0')}:${String(m).padStart(2, '0')}:${sec}`
}

const isDecimal = (v) => v === '' || (/^-?\d+(\.\d+)?$/.test(String(v)) && Number(v) >= 0 && Number(v) <= 100)

const localStore = {
  load(key) { try { return JSON.parse(globalThis.localStorage?.getItem(key) || 'null') } catch { return null } },
  save(key, value) { try { globalThis.localStorage?.setItem(key, JSON.stringify(value)) } catch { /* blocked */ } },
}

// Read-only, write-only and read-write elements of the SCORM 1.2 data model the shim supports.
const RO = new Set([
  'cmi._version', 'cmi.core._children', 'cmi.core.student_id', 'cmi.core.student_name', 'cmi.core.credit',
  'cmi.core.entry', 'cmi.core.score._children', 'cmi.core.total_time', 'cmi.core.lesson_mode', 'cmi.launch_data',
  'cmi.comments_from_lms', 'cmi.student_data._children', 'cmi.student_data.mastery_score',
  'cmi.objectives._children', 'cmi.objectives._count', 'cmi.interactions._children', 'cmi.interactions._count',
])
const WO = new Set(['cmi.core.exit', 'cmi.core.session_time'])
const RW = new Set(['cmi.core.lesson_location', 'cmi.core.lesson_status', 'cmi.core.score.raw', 'cmi.core.score.min', 'cmi.core.score.max', 'cmi.suspend_data', 'cmi.comments'])
const ARRAYS = /^cmi\.(objectives|interactions)\.(\d+)\.[a-z_.]+$/

// Creates one SCORM 1.2 API object for one learner and one lesson.
//   lessonKey   storage key, e.g. `${courseSlug}/${lessonId}`
//   learnerId   opaque id the backend already knows (never a name or email)
//   onEvent     (type, data) => void, defaults to analytics track()
export function createScormApi({
  lessonKey = 'scorm', learnerId = '', masteryScore = '', launchData = '', credit = 'credit', mode = 'normal',
  onEvent = track, storage = localStore,
} = {}) {
  const key = `sw-scorm:${lessonKey}`
  const saved = storage.load(key) || {}
  const cmi = {
    status: saved.status || 'not attempted',
    location: saved.location || '',
    raw: saved.raw ?? '', min: saved.min ?? '', max: saved.max ?? '',
    suspend: saved.suspend || '',
    comments: saved.comments || '',
    totalSeconds: saved.totalSeconds || 0,
    lastExit: saved.lastExit ?? null,
    arrays: saved.arrays || {},
    exit: '',
    session: null,
  }
  let state = 'not-initialized' // → running → finished
  let lastError = 0
  let started = 0
  let committed = { status: cmi.status, raw: cmi.raw, min: cmi.min, max: cmi.max }

  const ok = () => { lastError = 0; return 'true' }
  const fail = (code, ret = 'false') => { lastError = code; return ret }
  const entry = () => (cmi.lastExit === null ? 'ab-initio' : cmi.lastExit === 'suspend' ? 'resume' : '')
  const emit = (type, data) => { try { onEvent(type, data) } catch { /* never break the package */ } }
  const count = (kind) => String(Object.keys(cmi.arrays).filter((k) => k.startsWith(`cmi.${kind}.`)).reduce((s, k) => s.add(k.split('.')[2]), new Set()).size)

  const persist = () => storage.save(key, {
    status: cmi.status, location: cmi.location, raw: cmi.raw, min: cmi.min, max: cmi.max, suspend: cmi.suspend,
    comments: cmi.comments, totalSeconds: cmi.totalSeconds, lastExit: cmi.lastExit, arrays: cmi.arrays,
  })

  const commit = () => {
    // Mastery score: the LMS decides passed / failed from the raw score (SCORM 1.2 RTE 3.4.4).
    if (masteryScore !== '' && cmi.raw !== '' && credit === 'credit' && ['completed', 'incomplete', 'not attempted'].includes(cmi.status)) {
      cmi.status = Number(cmi.raw) >= Number(masteryScore) ? 'passed' : 'failed'
    }
    if (cmi.status !== committed.status) emit('scorm_status', { status: cmi.status, previous: committed.status })
    if (cmi.raw !== committed.raw || cmi.min !== committed.min || cmi.max !== committed.max) {
      if (cmi.raw !== '') emit('scorm_score', { raw: Number(cmi.raw), min: cmi.min === '' ? undefined : Number(cmi.min), max: cmi.max === '' ? undefined : Number(cmi.max) })
    }
    committed = { status: cmi.status, raw: cmi.raw, min: cmi.min, max: cmi.max }
    persist()
  }

  const get = (el) => {
    switch (el) {
      case 'cmi._version': return '3.4'
      case 'cmi.core._children': return 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time'
      case 'cmi.core.student_id': return learnerId
      case 'cmi.core.student_name': return '' // personal data stays on the server
      case 'cmi.core.lesson_location': return cmi.location
      case 'cmi.core.credit': return credit
      case 'cmi.core.lesson_status': return cmi.status
      case 'cmi.core.entry': return entry()
      case 'cmi.core.score._children': return 'raw,min,max'
      case 'cmi.core.score.raw': return String(cmi.raw)
      case 'cmi.core.score.min': return String(cmi.min)
      case 'cmi.core.score.max': return String(cmi.max)
      case 'cmi.core.total_time': return formatTimespan(cmi.totalSeconds)
      case 'cmi.core.lesson_mode': return mode
      case 'cmi.suspend_data': return cmi.suspend
      case 'cmi.launch_data': return launchData
      case 'cmi.comments': return cmi.comments
      case 'cmi.comments_from_lms': return ''
      case 'cmi.student_data._children': return 'mastery_score'
      case 'cmi.student_data.mastery_score': return String(masteryScore)
      case 'cmi.objectives._children': return 'id,score,status'
      case 'cmi.interactions._children': return 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency'
      case 'cmi.objectives._count': return count('objectives')
      case 'cmi.interactions._count': return count('interactions')
      default: return cmi.arrays[el] ?? ''
    }
  }

  const api = {
    LMSInitialize(arg) {
      if (arg !== '' && arg != null) return fail(201)
      if (state === 'running') return fail(101)
      state = 'running'
      started = Date.now()
      cmi.exit = ''
      cmi.session = null
      emit('scorm_launch', { version: '1.2', entry: entry(), status: cmi.status })
      return ok()
    },
    LMSFinish(arg) {
      if (arg !== '' && arg != null) return fail(201)
      if (state !== 'running') return fail(301)
      if (cmi.status === 'not attempted') cmi.status = 'incomplete' // the learner opened it; the SCO didn't report
      const sessionSeconds = cmi.session ?? Math.round((Date.now() - started) / 1000)
      cmi.totalSeconds += sessionSeconds
      cmi.lastExit = cmi.exit
      commit()
      emit('scorm_exit', {
        exit: cmi.exit || 'normal', sessionSeconds: Math.round(sessionSeconds), totalSeconds: Math.round(cmi.totalSeconds),
        status: cmi.status, raw: cmi.raw === '' ? undefined : Number(cmi.raw), suspendDataLength: cmi.suspend.length || undefined,
      })
      state = 'finished'
      return ok()
    },
    LMSGetValue(el) {
      if (state !== 'running') return fail(301, '')
      if (typeof el !== 'string' || !el.startsWith('cmi.')) return fail(201, '')
      if (WO.has(el)) return fail(404, '')
      if (/\._(children|count)$/.test(el) && !RO.has(el)) return fail(/_count$/.test(el) ? 203 : 202, '')
      if (!RO.has(el) && !RW.has(el) && !ARRAYS.test(el)) return fail(401, '')
      lastError = 0
      return get(el)
    },
    LMSSetValue(el, value) {
      if (state !== 'running') return fail(301)
      if (typeof el !== 'string' || !el.startsWith('cmi.')) return fail(201)
      const v = value == null ? '' : String(value)
      if (/\._(children|count|version)$/.test(el)) return fail(402)
      if (RO.has(el)) return fail(403)
      switch (el) {
        case 'cmi.core.lesson_status':
          if (!LESSON_STATUSES.includes(v) || v === 'not attempted') return fail(405)
          cmi.status = v
          return ok()
        case 'cmi.core.score.raw':
        case 'cmi.core.score.min':
        case 'cmi.core.score.max':
          if (!isDecimal(v)) return fail(405)
          cmi[el.split('.').pop()] = v
          return ok()
        case 'cmi.core.session_time':
          if (!TIMESPAN.test(v)) return fail(405)
          cmi.session = parseTimespan(v)
          return ok()
        case 'cmi.core.exit':
          if (!EXITS.includes(v)) return fail(405)
          cmi.exit = v
          return ok()
        case 'cmi.core.lesson_location':
          if (v.length > 255) return fail(405)
          cmi.location = v
          return ok()
        case 'cmi.suspend_data':
          if (v.length > 4096) return fail(405)
          cmi.suspend = v
          return ok()
        case 'cmi.comments':
          if (v.length > 4096) return fail(405)
          cmi.comments = v
          return ok()
        default:
          if (ARRAYS.test(el)) { cmi.arrays[el] = v; return ok() }
          return fail(401)
      }
    },
    LMSCommit(arg) {
      if (arg !== '' && arg != null) return fail(201)
      if (state !== 'running') return fail(301)
      commit()
      return ok()
    },
    LMSGetLastError: () => String(lastError),
    LMSGetErrorString: (code) => ERRORS[Number(code)] || '',
    LMSGetDiagnostic: (code) => ERRORS[Number(code === '' || code == null ? lastError : code)] || '',
  }
  return api
}

// Puts a fresh API on window.API (where SCORM 1.2 packages look for it) and returns it with a
// function that removes it again.
export function installScormApi(opts) {
  const api = createScormApi(opts)
  const prev = globalThis.window?.API
  if (globalThis.window) window.API = api
  const uninstall = () => {
    if (globalThis.window && window.API === api) {
      if (prev) window.API = prev
      else delete window.API
    }
  }
  return { api, uninstall }
}
