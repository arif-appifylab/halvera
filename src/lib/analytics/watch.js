// Watched-interval maths shared by audio and video: distinct watched segments count, not the
// furthest point (the admin's "Complete at" rule for video and audio lessons).

// Merge [start, end] pairs (seconds) into a sorted list without overlaps.
export function mergeIntervals(list) {
  const sorted = list
    .filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1]) && x[1] > x[0])
    .map(([a, b]) => [Math.max(0, a), b])
    .sort((a, b) => a[0] - b[0])
  const out = []
  for (const [a, b] of sorted) {
    const last = out[out.length - 1]
    if (last && a <= last[1] + 0.5) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

export const intervalsLength = (list) => mergeIntervals(list).reduce((s, [a, b]) => s + (b - a), 0)

// "04:30", "1:02:03", "12 min", "15 minutes", "2 h" → seconds (null when unknown).
export function parseDuration(value) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (/^\d+(:\d{1,2}){1,2}$/.test(v)) return v.split(':').reduce((s, n) => s * 60 + Number(n), 0)
  const m = v.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?|s|sec|secs|seconds?)\b/i)
  if (!m) return null
  const n = Number(m[1])
  const u = m[2][0].toLowerCase()
  return Math.round(u === 'h' ? n * 3600 : u === 'm' ? n * 60 : n)
}

// Follows a playhead and keeps the union of what has played.
//   const w = createWatchTracker(duration)
//   w.at(position)   call on every timeupdate / tick while playing; jumps > 3 s start a new segment
//   w.stop()         on pause / seek / end; returns the segment just closed ([from, to]) or null
//   w.watched()      de-duplicated watched seconds; w.percent() against the duration
export function createWatchTracker(duration = null) {
  const segments = []
  let start = null
  let last = null
  let total = duration

  const close = () => {
    if (start == null || last == null || last <= start) { start = null; last = null; return null }
    const seg = [start, last]
    segments.push(seg)
    start = null
    last = null
    return seg
  }

  return {
    setDuration(d) { if (Number.isFinite(d) && d > 0) total = d },
    at(position) {
      if (!Number.isFinite(position)) return
      if (start == null) { start = position; last = position; return }
      if (position < last || position - last > 3) { close(); start = position }
      last = position
    },
    stop: close,
    position: () => last,
    segments: () => mergeIntervals(start != null && last > start ? [...segments, [start, last]] : segments),
    watched() { return Math.round(intervalsLength(this.segments())) },
    percent() { return total ? Math.min(100, Math.round((this.watched() / total) * 100)) : null },
  }
}
