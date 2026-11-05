# Page recipes

Which components build each page in the inventory. Designed pages (T) follow these orders; shared pages (S) use the same components themed by the tokens.

## Health & wellness nav

`SiteHeader` with: Programmes · What we help with · How it works · Membership · Blog · About us · Contact us · **Book a consultation**. Drop any item the school doesn't have.

## Designed pages (T)

| Page | Route | Build it from |
|---|---|---|
| Home | `/` | `Hero` (split, Book a consultation + Explore programmes) → `Section` "What we help with" with `FeatureCard` ×3–6 → `Section` with `FitList` → `Section tone="sage"` with `FeatureSteps` (3 steps) → `Section` "Programmes" with `ProductCard` grid → `Section` with `PractitionerCard` → `Section tone="clay"` with `Testimonial` ×3 → `Section` "Membership" with `PlanCard` ×2–3 → `LeadMagnet` (free guide opt-in) → `CtaBand` → `Disclaimer` → `SiteFooter` |
| What we help with | `/conditions` | `Hero` center → `FeatureCard` grid linking to each condition → `CtaBand` → `Disclaimer` |
| Condition | `/conditions/[slug]` | `Breadcrumbs` → `Hero` center → `Section` symptoms and approach → `FitList` → related `ProductCard`s → `Accordion` FAQ → `CtaBand` → `Disclaimer` |
| How it works | `/how-it-works` | `Hero` center → `FeatureSteps` → `Stepper vertical` for the first consultation → `PlanCard`s or `ProductCard`s → `Accordion` → `CtaBand` |
| Medical disclaimer | `/disclaimer` | `Section width="prose"` with the school's text; `Disclaimer` at top |
| About us | `/about-us` | `Hero` split → story `Section` → `PractitionerCard` list with credentials → values `FeatureCard`s → `CtaBand` |
| Contact us | `/contact-us` | `Section width="narrow"`: `TextField`s, `Select`, consent `Checkbox` (unticked), `Button`; address and map for in-person schools |
| Blog | `/blog` | Featured post, `Tabs pill` for categories, search `TextField iconStart="search"`, cards, `Pagination` |
| Courses / All products | `/courses`, `/all-products` | `Tabs pill` named by product type (only types sold), filters as `Select`s, `ProductCard` grid, `Pagination`, `EmptyState` for no results |
| Course | `/course/[slug]` | Header (title `heading-1`, `PriceTag`, `RadioCard` price picker when several prices), About, Curriculum with `LessonRow`s (free preview badges), Benefits, `Testimonial`s, `Accordion` FAQ, `PractitionerCard`, sticky "Enroll for {price}" `Button` |
| Memberships | `/memberships` | `SegmentedToggle` monthly / yearly / lifetime → `PlanCard`s side by side (allowances listed) → `Accordion` |
| 404 | — | `EmptyState` with search and links to Courses and All products |

## Shared pages (S)

| Area | Components |
|---|---|
| Sign-in (`/login`, `/signup`, 2FA, verify) | `Card` in `container-narrow`, email-first `TextField` → `TextField type="password"` + `PasswordRules`, `OtpInput`, `Checkbox` terms + consent, `Notice` for locked / pending / blocked domain |
| Consultation booking (`/appointment/[slug]`) | `Stepper` (Date and time · Your details · Payment · Confirmed) → `SlotPicker` → intake form (`TextField`, `Select`, `Checkbox`, `RadioCard`) → checkout or allowance → `Notice tone="success"`; `StateNotice` when no times are left |
| Checkout (`/checkout/[id]`) | Two columns: account step + fields + payment `RadioCard`s + agreements, beside `OrderSummary` + `CouponField`. States: `Notice` for failed payment, `StateNotice` for "This checkout isn't available" and expired links |
| Cart | `Drawer` with `OrderSummary`, "must be bought on its own" note, `EmptyState` |
| Membership plan picker | `Modal` with `RadioCard`s for each public plan, Upgrade where it applies |
| Unavailable / ended / sold out | `StateNotice` with reason, title, image and next step |
| Guided audio (media library) | `AudioPlayer` per episode, `LessonRow type="audio"` lists, `Badge` for Main / Bonus / Free |
| Dashboard home | `DashboardNav` + `StatTile`s (next session, this week's practice, sessions left) + continue-learning `ProgressBar` + `Countdown` to the next session |
| Profile tabs and payments | `Tabs` + `DataTable` with `StatusBadge` cells; `Notice` for past due with Update card |
| Cancel flow | `Stepper` of the steps the school turned on, `RadioCard` reasons, offer `Card tone="sage"`, `Button variant="danger"` to confirm |
| Settings | `Switch` rows that save instantly; `Modal` to confirm "Unsubscribe from all marketing" |
| System states | `EmptyState`, `Skeleton`, `Notice`, `StateNotice` |
