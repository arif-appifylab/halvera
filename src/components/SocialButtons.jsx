import { Button } from '@/design-system'
import './social-buttons.css'

// "Continue with Google / Apple / Facebook": the sign-in options the school turns on (Settings → Sign up and
// log in). Used on the log in and sign up pages, and at the top of checkout. Text labels with a simple line
// icon, not brand logos.
const SOCIAL = [
  { name: 'Google', paths: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20.5 12H12.5'] },
  {
    name: 'Apple',
    paths: [
      'M12 7.6c-1.7-1-4.6-.9-6 1.6-1.4 2.6-.6 6.3 1.2 8.9.9 1.3 1.9 2.4 3 2.1.8-.2 1.1-.6 1.8-.6s1 .4 1.8.6c1.1.3 2.1-.8 3-2.1.5-.8.9-1.6 1.1-2.3-1.5-.7-2.3-2-2.3-3.6 0-1.3.6-2.4 1.6-3.1-1.4-1.8-3.8-2.2-5.2-1.5z',
      'M12 7.4c-.1-2 1.2-3.8 3-4.2',
    ],
  },
  { name: 'Facebook', paths: ['M14 21v-8h3l.4-3.4H14V7.6c0-1 .3-1.6 1.7-1.6h1.8V3.1a22 22 0 0 0-2.6-.1c-2.6 0-4.3 1.6-4.3 4.4v2.2H7.7V13h2.9v8'] },
]

// row: side by side (checkout) instead of stacked (log in, sign up).
export default function SocialButtons({ onPick, busy, row = false }) {
  return (
    <div className={row ? 'social-row' : 'pg-stack-sm'}>
      {SOCIAL.map((s) => (
        <Button key={s.name} variant="secondary" block className="social-btn" loading={busy === s.name} disabled={Boolean(busy)} onClick={() => onPick(s.name)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {s.paths.map((d) => <path key={d} d={d} />)}
          </svg>
          {row ? s.name : `Continue with ${s.name}`}
          {row && <span className="sg-sr"> (continue with {s.name})</span>}
        </Button>
      ))}
    </div>
  )
}
