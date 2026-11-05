Halvera is the design system for the **Health & wellness** school template (category 2, alongside Wellbeing Holistic, My Body Viva and Drops of Health). Its one primary action is **Book a consultation**. It covers every page kind in the page inventory: the designed (T) pages, the shared (S) pages themed by these tokens, the buying flow, the student dashboard and system states. Every page also follows the product rules (`R-…`); the components below already encode the ones that touch the UI.

The feeling to hold: a calm practitioner's room. Warm oat ground, sage green for action, clay for warmth, generous space, a serif that speaks softly. Never clinical, never a spa cliché.

## Content fundamentals

- **Voice:** warm, plain and reassuring, like a practitioner talking to one person. Write to "you"; the school speaks as "we" (or "I" for a solo practitioner). Short sentences.
- **Promise care, not cures.** "Gentle support for gut health" — never "cure IBS in 30 days". No before/after claims, no fear-based urgency, no fake countdowns.
- **Sentence case everywhere**, buttons included: "Book a consultation", "Explore programmes", "Get the free guide". The only all-caps text is the `eyebrow` style.
- **Name the next step.** Buttons are verbs with an object. The header, hero and closing band all say **Book a consultation**.
- **Spell it out.** Prices come formatted from the server ("$29 / month", "3 × $99", "Free"). Dates as "Tue 21 Oct, 10:30" with the time zone named.
- **No emoji** in UI copy. Testimonials only in clients' real words.
- Real examples: "Feel at home in your body again" · "Who it's for, and who it's not for" · "Ready to feel like yourself again?" · "This event has ended" · "Included in a membership".

## Visual foundations

### Colour
- Pages sit on `surface` (oat). Cards, inputs and panels on `surface-raised`. Alternate one tinted band per section: `surface-sage` (How it works, membership), `surface-sunken` (neutral), `surface-clay` (free guide, testimonials — at most twice a page). The footer and the closing CTA band use `surface-inverse` with `ink-inverse`.
- Text is `ink`; secondary text `ink-muted`. Both hold 4.5:1 on every `surface-*` token in both themes. `ink-subtle` is for placeholders only.
- `primary` (sage) is the action colour: primary buttons, links, selected states, progress. Text on it is `on-primary`.
- `accent` (clay) adds warmth: eyebrows, the one highlighted phrase in a headline, the free-guide button, saving labels. Never errors.
- `honey` is decorative only (stars, cover). Never text.
- Status colours (`success`, `warning`, `danger`, `info`, each with a `-soft` fill) always carry an icon and a word. Danger and success differ in lightness, not hue alone.

### Type
- **Newsreader** (`--font-display`) for headlines, prices, quotes and card titles: regular weight, slightly tight tracking. **Figtree** (`--font-sans`) for everything else. Both load from Google Fonts in `components/bundle.css`.
- Scale: `display-xl` (home hero only) → `display-lg` (page heroes) → `heading-1` (product titles) → `heading-2` (section titles) → `heading-3` (card titles) → `heading-4` (panel titles, sans). Body copy is `body`; intros `body-lg`; meta `body-sm`; badges `caption`.
- Highlight one phrase per headline in clay italic (`Hero` `highlight`). One per page.
- Mobile: `display-xl` 44px, `display-lg` 36px, `heading-1` 32px, `heading-2` 28px.

### Space, shape, depth
- 4px base: `space-1`…`space-10`. Sections pad `space-9` on desktop, `space-8` on mobile. Card padding `space-5`–`space-6`. Grid gaps `space-5`.
- Radii: `radius-pill` for buttons, tabs, switches; `radius-md` for inputs and slots; `radius-lg` for cards; `radius-xl` for images and the CTA band. Hero and practitioner photos take one large arched corner (the inline-end bottom), the template's signature shape.
- Depth comes from tinted grounds and hairlines (`line`), not shadows. `shadow-md` only on hover and dropdowns; `shadow-lg` only on modals and drawers.
- Containers: `container` 1200px for pages, `container-narrow` for checkout, sign-in and the cancel flow, `container-prose` for blog posts, legal pages and the disclaimer.

### Imagery
- Natural light, real people and real practitioners, food, hands, plants, quiet interiors. Warm and slightly desaturated. Never stock "doctor with clipboard", never pills.
- Unavailable products keep their image, desaturated (`StateNotice`).

### States and motion
- Hover darkens fills (`primary-hover`, `accent-hover`) or tints with `surface-sunken`. Focus is a 2px solid `focus` ring with 2px offset on every interactive element (3:1 on all surfaces).
- Motion is short (150–200ms) and only for state: hover lifts, switch thumbs, skeleton shimmer. All of it stops under `prefers-reduced-motion`.
- Every list and dashboard page has an empty, a loading (`Skeleton`) and an error state (`Notice tone="danger"`).

## Iconography

- `Icon` draws a small Lucide-style line set: 24px grid, 1.75px stroke, round caps, `currentColor`. Names are in `iconNames`. The set was drawn for this system; in the Vite project you can swap in `lucide-react` with the same names and stroke.
- Directional icons (arrows, chevrons, logout) flip automatically in right-to-left.
- The template has no logo: `Wordmark` sets the school name in Newsreader with a leaf mark until the school uploads its own logo (`logoSrc`).
- No emoji, no filled icons, no illustrated mascots.

## Right to left and languages

- Every component uses logical CSS (`margin-inline`, `inset-inline-start`, `border-end-end-radius`), so setting `dir="rtl"` on `<html>` mirrors the layout (R-LANG-2). Arabic text switches to IBM Plex Sans Arabic and Noto Naskh Arabic; letter-spacing is removed.
- Codes, OTP cells, countdowns and audio timelines stay left to right inside RTL.
- Font stacks include Bengali and Arabic fallbacks for the enabled languages (R-LANG-1).

## Product rules the components enforce

- Prices are display-only strings from the server (`PriceTag`, `OrderSummary`); a 0 price shows **Free** (R-PRICE-10, R-PRICE-11).
- `ProductCard` handles public, membership-only ("Included in a membership" + plan picker), private ("Request access") and sold out / sales ended / enrolment closed (R-VIS-1, R-APPR-1, R-PRICE-6).
- Consent `Checkbox` is never pre-ticked; terms are separate required boxes (R-MKT-1, R-CO-5).
- Unavailable products use `StateNotice`, never Not found (R-VIS-4).
- `StatusBadge` uses the platform's exact status words (R-ORD-2, R-SUB-6, R-CERT-2).
- Hide anything the school doesn't use: no cart icon with the cart off, no XP or levels with gamification off (R-CART-2, R-GAM-4).
