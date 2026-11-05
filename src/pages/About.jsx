import { Hero, Section, PractitionerCard, FeatureCard, Icon, Testimonial, CtaBand } from '@/design-system'
import { practitioners, testimonials } from '@/data/people.js'
import { appointmentTypes } from '@/data/appointments.js'
import { school } from '@/data/school.js'
import { aboutHero, story, team, values, credentials, featuredStories, aboutCta } from '@/data/about.js'
import './about.css'

// Each practitioner's own appointments (listed ones they host alone), linked to their booking pages.
const sessionsWith = (id) => appointmentTypes.filter((t) => t.listed !== false && t.kind === 'standard' && t.hosts.length === 1 && t.hosts[0] === id)
const priceOf = (t) => (t.includedIn?.only ? 'Included in a membership' : t.price === 0 ? 'Free' : t.price)

const stories = featuredStories.map((name) => testimonials.find((t) => t.name === name)).filter(Boolean)

// /about-us: who we are, how we work and who you will work with.
export default function About() {
  return (
    <>
      <Hero {...aboutHero} layout="split" primary={school.consultation} />

      <Section eyebrow={story.eyebrow} title={story.title} width="prose">
        <div className="pg-prose">
          {story.paragraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          <p className="about-signature">{story.signature}</p>
        </div>
      </Section>

      <Section tone="sunken" eyebrow={team.eyebrow} title={team.title} intro={team.intro}>
        <div className="about-team">
          {practitioners.map(({ id, href: _profile, ...p }) => {
            const sessions = sessionsWith(id)
            return (
              <div key={id} id={`team-${id}`} className="about-member">
                <PractitionerCard {...p} />
                {sessions.length > 0 && (
                  <div className="about-book">
                    <h4 className="t-body-sm t-strong">Book with {p.name.replace(/^Dr /, '').split(' ')[0]}</h4>
                    <ul>
                      {sessions.map((t) => (
                        <li key={t.slug}>
                          <a href={`/appointment/${t.slug}`}>{t.title}</a>
                          <span className="t-muted"> · {t.duration} · {t.location.kind === 'person' ? 'In person' : 'Online'} · {priceOf(t)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section eyebrow={values.eyebrow} title={values.title}>
        <div className="pg-grid-4">
          {values.items.map((v) => <FeatureCard key={v.title} {...v} />)}
        </div>
        <p className="t-body-sm t-muted about-creds">
          <Icon name="check-circle" size={18} />
          <span>{credentials}</span>
        </p>
      </Section>

      {stories.length > 0 && (
        <Section tone="clay" eyebrow="Client stories" title="In their own words">
          <div className="pg-grid-2">
            {stories.map((t) => <Testimonial key={t.name} {...t} />)}
          </div>
        </Section>
      )}

      <CtaBand {...aboutCta} primary={school.consultation} />

    </>
  )
}
