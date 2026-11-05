import { cx } from '@/design-system'

// Line icons for the lesson tools that the design-system set doesn't have, drawn on the same grid
// (24px, 1.75 stroke, round caps, currentColor). Directional ones flip in right to left.
const PATHS = {
  resources: ['m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 1 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5'],
  discussion: ['M7.9 20A9 9 0 1 0 4 16.1L2 22Z'],
  notes: ['M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4', 'M2 6h4', 'M2 10h4', 'M2 14h4', 'M2 18h4', 'M21.4 5.6a2.1 2.1 0 1 0-3-3l-5 5a2 2 0 0 0-.5.9l-.8 2.8a.5.5 0 0 0 .6.6l2.9-.8a2 2 0 0 0 .8-.5Z'],
  transcript: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M7 15h4', 'M15 15h2', 'M7 11h2', 'M13 11h4'],
  overview: ['M4 6h16', 'M4 12h10', 'M4 18h13'],
  edit: ['M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8L2 21.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5Z', 'm15 5 4 4'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  like: ['M7 10v12', 'M15 5.9 14 10h5.8a2 2 0 0 1 2 2.6l-2.4 8a2 2 0 0 1-1.9 1.4H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z'],
  reply: ['m9 17-5-5 5-5', 'M20 18v-2a4 4 0 0 0-4-4H4'],
  'panel-close': ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M15 3v18', 'm8 9 3 3-3 3'],
  'panel-open': ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M15 3v18', 'm10 15-3-3 3-3'],
}
const DIRECTIONAL = ['reply', 'panel-close', 'panel-open']

export function LtIcon({ name, size = 20, className }) {
  const d = PATHS[name] || []
  return (
    <svg
      className={cx('lt-icon', DIRECTIONAL.includes(name) && 'lt-flip', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.map((p) => <path key={p} d={p} />)}
    </svg>
  )
}
