import { Hero, Section, FeatureCard, Button, CtaBand } from '@/design-system'
import { conditions } from '@/data/conditions.js'
import { school } from '@/data/school.js'
import './conditions.css'

// /conditions: "Health topics". One card per condition, each opening its own page.
export default function Conditions() {
  return (
    <>
      <Hero
        layout="center"
        eyebrow="Health topics"
        title="Support for the things that wear you down"
        highlight="wear you down"
        subtitle="Most people come to us with more than one concern. Start with the one that matters most to you; we look at the whole picture from there."
      />

      <Section className="cond-first" title="Areas we work with" intro="Choose an area to see the common signs, how we approach it and the programmes that can help.">
        <div className="pg-grid">
          {conditions.map((c) => (
            <FeatureCard
              key={c.slug}
              icon={c.icon}
              title={c.title}
              text={c.text}
              href={`/conditions/${c.slug}`}
              linkLabel="Read more"
            />
          ))}
        </div>
      </Section>

      <Section tone="sunken" width="narrow">
        <div className="cond-unsure">
          <p className="sg-eyebrow">Not sure where you fit?</p>
          <h2 className="t-heading-2">Talk it through with us first</h2>
          <p className="t-body-lg t-muted">
            Symptoms rarely fit neatly into one box. In a free 20-minute call we listen to what is going on,
            tell you honestly whether we can help, and suggest a sensible place to start.
          </p>
          <div className="pg-row cond-unsure-actions">
            <Button href={school.consultation.href} iconStart="calendar">{school.consultation.label}</Button>
            <Button variant="link" href="/contact-us">Or send us a question</Button>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Ready to feel like yourself again?"
        primary={school.consultation}
        secondary={{ label: 'Explore programmes', href: '/courses' }}
      />

    </>
  )
}
