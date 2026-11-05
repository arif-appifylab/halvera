import { useEffect, useRef, useState } from 'react'
import { Section, Badge, Button, SegmentedToggle, Notice } from '@/design-system'
import { school } from '@/data/school.js'
import { palettes, SWATCH_ROLES, DEFAULT_PALETTE, getSavedPalette, setPalette, previewHref } from '@/app/palette.js'
import { designStyles, DEFAULT_STYLE, getSavedStyle, setStyle } from '@/app/design-style.js'
import { darkFooters, DEFAULT_DARKFOOT, getSavedDarkFooter, setDarkFooter } from '@/app/dark-footer.js'
import { lightVersions, DEFAULT_LIGHT, ORIGINAL_LIGHT, ORIGINAL_SWATCHES, getSavedLight, setLight } from '@/app/light-version.js'
import './palettes.css'

// Client review page: compare the colour palettes and design styles on the live home page and pick them.
// Not linked from the school's navigation.

const VIRTUAL_WIDTH = 1280 // the preview renders the home page at desktop width, then scales it down
const THEMES = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]

// `bottom` scrolls the page inside to its end (for the footer previews).
function PreviewFrame({ src, title, className, bottom }) {
  const ref = useRef(null)
  const [scale, setScale] = useState(0.42)
  const [loadedSrc, setLoadedSrc] = useState('')
  const loaded = loadedSrc === src

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setScale(w / VIRTUAL_WIDTH)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className={'pal-frame' + (className ? ` ${className}` : '') + (loaded ? ' is-loaded' : '')} style={{ '--pal-scale': scale }}>
      <p className="pal-frame-loading t-body-sm t-muted" aria-hidden={loaded}>Loading the preview</p>
      <iframe src={src} title={title} loading="lazy" tabIndex={-1} onLoad={(e) => { setLoadedSrc(src); if (bottom) toBottom(e.currentTarget) }} />
    </div>
  )
}

// Scroll a same-origin preview to its end, again once late images have loaded and changed the height.
function toBottom(frame) {
  const go = () => { try { const w = frame.contentWindow; w.scrollTo(0, w.document.documentElement.scrollHeight) } catch { /* not same-origin */ } }
  go()
  setTimeout(go, 600)
  setTimeout(go, 1500)
}

function Swatches({ values }) {
  return (
    <ul className="pal-swatches">
      {SWATCH_ROLES.map(({ token, label }) => (
        <li key={token} className="pal-swatch">
          <span className="pal-chip" style={{ background: values[token] }} aria-hidden="true" />
          <span className="pal-swatch-label t-caption">{label}</span>
          <code className="pal-swatch-hex">{values[token]}</code>
        </li>
      ))}
    </ul>
  )
}

function PaletteCard({ palette, theme, style, inUse, onUse }) {
  const isDefault = palette.id === DEFAULT_PALETTE
  const href = previewHref(palette.id, theme, '/', style)

  return (
    <article className="pal-card" aria-labelledby={`pal-${palette.id}-name`}>
      <header className="pal-card-head">
        <div className="pg-row">
          <h3 id={`pal-${palette.id}-name`} className="t-heading-3">{palette.name}</h3>
          {isDefault && <Badge>Current design</Badge>}
          {inUse && <Badge tone="primary" icon="check">In use</Badge>}
        </div>
        <p className="t-muted">{palette.idea}</p>
      </header>

      <PreviewFrame src={href} title={`Home page in ${palette.name}, ${theme} theme`} />
      <Swatches values={palette.swatches[theme]} />

      <div className="pal-actions">
        {inUse ? (
          <Button variant="secondary" iconStart="check" disabled>In use</Button>
        ) : (
          <Button variant="secondary" onClick={() => onUse(palette.id)}>Use this one</Button>
        )}
        <Button variant="ghost" href={href} target="_blank" rel="noopener" iconEnd="arrow-right">
          Open full page<span className="pal-sr"> (opens in a new tab)</span>
        </Button>
      </div>
    </article>
  )
}

function StyleCard({ item, palette, theme, inUse, onUse }) {
  const href = previewHref(palette, theme, '/', item.id)
  return (
    <article className="pal-card" aria-labelledby={`sty-${item.id}-name`}>
      <header className="pal-card-head">
        <div className="pg-row">
          <h3 id={`sty-${item.id}-name`} className="t-heading-3">{item.name}</h3>
          {item.id === DEFAULT_STYLE && <Badge>Current design</Badge>}
          {inUse && <Badge tone="primary" icon="check">In use</Badge>}
        </div>
        <p className="t-muted">{item.idea}</p>
      </header>
      <PreviewFrame src={href} title={`Home page in the ${item.name} style, ${theme} theme`} />
      <div className="pal-actions">
        {inUse ? (
          <Button variant="secondary" iconStart="check" disabled>In use</Button>
        ) : (
          <Button variant="secondary" onClick={() => onUse(item.id)}>Use this one</Button>
        )}
        <Button variant="ghost" href={href} target="_blank" rel="noopener" iconEnd="arrow-right">
          Open full page<span className="pal-sr"> (opens in a new tab)</span>
        </Button>
      </div>
    </article>
  )
}

function FooterCard({ item, palette, style, inUse, onUse }) {
  const href = `${previewHref(palette, 'dark', '/', style)}&darkfoot=${item.id}`
  return (
    <article className="pal-card" aria-labelledby={`foot-${item.id}-name`}>
      <header className="pal-card-head">
        <div className="pg-row">
          <h3 id={`foot-${item.id}-name`} className="t-heading-3">{item.name}</h3>
          {inUse && <Badge tone="primary" icon="check">In use</Badge>}
        </div>
        <p className="t-muted">{item.idea}</p>
      </header>
      <PreviewFrame src={href} title={`Footer in dark mode: ${item.name}`} className="is-footer" bottom />
      <div className="pal-actions">
        {inUse ? (
          <Button variant="secondary" iconStart="check" disabled>In use</Button>
        ) : (
          <Button variant="secondary" onClick={() => onUse(item.id)}>Use this one</Button>
        )}
        <Button variant="ghost" href={href} target="_blank" rel="noopener" iconEnd="arrow-right">
          Open full page<span className="pal-sr"> (opens in a new tab)</span>
        </Button>
      </div>
    </article>
  )
}

// The whiter light versions, previewed on the home page or a member's Membership tab.
const LIGHT_PAGES = [{ value: '/', label: 'Home' }, { value: '/student/dashboard/memberships', label: 'Dashboard' }]

function LightCard({ item, style, inUse, onUse }) {
  const [page, setPage] = useState('/')
  const href = `${previewHref('midnight', 'light', page, style)}&light=${item.id}${page === '/' ? '' : '&as=member'}`
  return (
    <article className="pal-card" aria-labelledby={`light-${item.id}-name`}>
      <header className="pal-card-head">
        <div className="pg-row">
          <h3 id={`light-${item.id}-name`} className="t-heading-3">{item.name}</h3>
          {item.id === DEFAULT_LIGHT && <Badge>Current design</Badge>}
          {inUse && <Badge tone="primary" icon="check">In use</Badge>}
        </div>
        <p className="t-muted">{item.idea}</p>
      </header>
      <div className="pal-preview">
        <div className="pg-row-between">
          <p className="t-body-sm t-strong">Preview</p>
          <SegmentedToggle label={`Preview page for ${item.name}`} options={LIGHT_PAGES} value={page} onChange={setPage} />
        </div>
        <PreviewFrame src={href} title={`${page === '/' ? 'Home page' : 'Membership tab'} in ${item.name}`} />
      </div>
      <div className="pal-tint-compare t-caption">
        <span>
          {ORIGINAL_SWATCHES.map((c) => <i key={c} className="pal-chip" style={{ background: c }} aria-hidden="true" />)}
          Original
        </span>
        <span>
          {item.swatches.map((c) => <i key={c} className="pal-chip" style={{ background: c }} aria-hidden="true" />)}
          {item.name}
        </span>
      </div>
      <div className="pal-actions">
        {inUse ? (
          <Button variant="secondary" iconStart="check" disabled>In use</Button>
        ) : (
          <Button variant="secondary" onClick={() => onUse(item.id)}>Use this one</Button>
        )}
        <Button variant="ghost" href={href} target="_blank" rel="noopener" iconEnd="arrow-right">
          Open full page<span className="pal-sr"> (opens in a new tab)</span>
        </Button>
      </div>
    </article>
  )
}

export default function Palettes() {
  const [chosen, setChosen] = useState(getSavedPalette)
  const [chosenStyle, setChosenStyle] = useState(getSavedStyle)
  // Dark first: the dark themes are what the client asked to compare.
  const [theme, setTheme] = useState('dark')
  const [confirmed, setConfirmed] = useState(null)
  const [chosenFoot, setChosenFoot] = useState(getSavedDarkFooter)
  const [chosenLight, setChosenLight] = useState(getSavedLight)

  const use = (id) => {
    setPalette(id)
    setChosen(id)
    setConfirmed({ name: palettes.find((p) => p.id === id).name, isDefault: id === DEFAULT_PALETTE, back: palettes.find((p) => p.id === DEFAULT_PALETTE).name })
  }
  const chooseStyle = (id) => {
    setStyle(id)
    setChosenStyle(id)
    setConfirmed({ name: `The ${designStyles.find((d) => d.id === id).name} style`, isDefault: id === DEFAULT_STYLE, back: 'Soft' })
  }

  const chooseFoot = (id) => {
    setDarkFooter(id)
    setChosenFoot(id)
    setConfirmed({ name: `The ${darkFooters.find((d) => d.id === id).name} footer`, isDefault: id === DEFAULT_DARKFOOT, back: darkFooters[0].name })
  }

  const chooseLight = (id) => {
    setLight(id)
    setChosenLight(id)
    const name = id === ORIGINAL_LIGHT ? 'The original oat light mode' : `The ${lightVersions.find((v) => v.id === id).name} light mode`
    setConfirmed({ name, isDefault: id === DEFAULT_LIGHT, back: 'Pure white' })
  }


  return (
    <>
      <header className="pg-head">
        <div className="sg-container">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">Theme preview</p>
            <h1 className="t-display-lg">Choose colours and a style</h1>
            <p className="t-body-lg t-muted">
              Pick a colour combination and a design style for {school.name}; any colour goes with any style.
              Every colour option keeps text readable in light and dark (WCAG AA contrast). The previews show the
              live home page; switch them between dark and light, then choose what feels right.
            </p>
          </div>
        </div>
      </header>

      <Section tone="sunken">
        <div className="pal-bar">
          <p className="t-strong">Show the previews in</p>
          <SegmentedToggle label="Preview theme" options={THEMES} value={theme} onChange={setTheme} />
        </div>

        <div className="pal-status" aria-live="polite">
          {confirmed && (
            <Notice
              tone="success"
              title={`${confirmed.name} is now on across the site`}
              action={<Button variant="link" href="/" iconEnd="arrow-right">See the home page</Button>}
              onDismiss={() => setConfirmed(null)}
            >
              Every page in this browser uses it now. You can change it here at any time
              {confirmed.isDefault ? '.' : `, or go back to ${confirmed.back}.`}
            </Notice>
          )}
        </div>

        <div className="pal-group">
          <div className="pal-group-head">
            <h2 className="t-heading-2">Colours</h2>
            <p className="t-muted">Eight colour combinations, shown in the {designStyles.find((d) => d.id === chosenStyle).name} style. The last four are new, with deeper, cleaner dark modes.</p>
          </div>
          <div className="pal-grid">
            {palettes.map((p) => (
              <PaletteCard key={p.id} palette={p} theme={theme} style={chosenStyle} inUse={chosen === p.id} onUse={use} />
            ))}
          </div>
        </div>

        <div className="pal-group">
          <div className="pal-group-head">
            <h2 className="t-heading-2">Design style</h2>
            <p className="t-muted">The shape and type of the site: corners, buttons, headings and shadows. Shown in {palettes.find((p) => p.id === chosen).name}.</p>
          </div>
          <div className="pal-grid is-three">
            {designStyles.map((d) => (
              <StyleCard key={d.id} item={d} palette={chosen} theme={theme} inUse={chosenStyle === d.id} onUse={chooseStyle} />
            ))}
          </div>
        </div>

        <div className="pal-group" id="light-version">
          <div className="pal-group-head">
            <h2 className="t-heading-2">Light mode: whiter versions</h2>
            <p className="t-muted">
              Four whiter grounds for Midnight &amp; gold in light mode; Pure white is the one in use. Navy, gold and the text stay the same; only the page,
              panels, tints and lines change. Dark mode is not affected. Switch each preview between the home page and the
              dashboard.
            </p>
            <p>
              {chosenLight === ORIGINAL_LIGHT
                ? <>The original oat ground is in use. <Button variant="link" onClick={() => chooseLight(DEFAULT_LIGHT)}>Use Pure white</Button></>
                : <Button variant="link" onClick={() => chooseLight(ORIGINAL_LIGHT)}>Use the original oat ground instead</Button>}
            </p>
          </div>
          <div className="pal-grid">
            {lightVersions.map((v) => (
              <LightCard key={v.id} item={v} style={chosenStyle} inUse={chosenLight === v.id} onUse={chooseLight} />
            ))}
          </div>
        </div>

        <div className="pal-group" id="dark-footer">
          <div className="pal-group-head">
            <h2 className="t-heading-2">Footer in dark mode</h2>
            <p className="t-muted">
              The box that closes each page (“Not sure which plan suits you?”) and the footer, in dark mode only. Light mode
              keeps the dark footer it has. Shown at the bottom of the home page in {palettes.find((p) => p.id === chosen).name}.
            </p>
          </div>
          <div className="pal-grid">
            {darkFooters.map((d) => (
              <FooterCard key={d.id} item={d} palette={chosen} style={chosenStyle} inUse={chosenFoot === d.id} onUse={chooseFoot} />
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}
