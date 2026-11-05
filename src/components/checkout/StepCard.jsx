// One section of the pay panel: a quiet heading, an optional action on the inline end and
// the fields. Sections that don't apply aren't rendered.
export default function StepCard({ id, title, badge, intro, action, children }) {
  return (
    <section className="co-section" id={id} aria-labelledby={`${id}-title`}>
      <header className="co-section-head">
        <h2 className="t-heading-4 co-section-title" id={`${id}-title`}>{title}{badge}</h2>
        {action && <div className="co-section-action">{action}</div>}
      </header>
      {intro && <p className="co-section-intro t-body-sm t-muted">{intro}</p>}
      <div className="co-section-body">{children}</div>
    </section>
  )
}
