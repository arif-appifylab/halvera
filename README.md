# Halvera

The Halvera theme for EzyCourse 2.0: the Health & wellness school template, shown as a fictional
school, Halvera. Vite + React 19 + React Router 7. Every school setting is on (cart, memberships,
blog, appointments, languages, gamification) and every product type and state is represented.

```bash
npm install
npm run dev
```

Open `/theme-states` for a list of every page and state, including all access gate screens. The
**Preview as** button (bottom corner) switches between visitor, student and member, and sets site
access (none / active / ended) and email confirmation, so every state can be checked.

## Colour palettes and theme

- **Light / dark:** the sun/moon menu in the header offers Light, Dark and Match system. Logic in
  `src/app/theme.js`; the inline script in `index.html` applies it before first paint.
- **Look:** Midnight & gold, with the Pure white light mode, the Deep footer in dark mode and the Soft style.
  `/palettes` keeps every option to compare on live previews: 8 palettes, 3 design styles, 4 light modes and
  4 dark-mode footers. "Use this one" applies a choice site-wide (saved in `localStorage`, keys `halvera-*`);
  `?palette=`, `?style=`, `?light=` and `?darkfoot=` preview one. Every palette pair is checked for WCAG AA
  contrast.

## Layout

| Path | What |
|---|---|
| `src/design-system/` | The Halvera design system (components, styles, tokens, prop docs, brand book, page recipes). Local changes, all marked "Local change" / "Local fix" in the code (send upstream): `SiteHeader` takes `onCartClick`, `extraActions`, `menuTools`, `account` (the signed-in account menu) and `menuAccount` (its phone version); `DashboardNav` takes `logout={false}`; `LessonRow` has icons for every lesson type; `PasswordRules` stays hidden until the person types (or `show` is set); `components.css` fixes the drawer height and keeps the table's hidden caption inside its scroll area. |
| `src/design-system/tokens.json` | Single source for tokens. `tokens.css` is generated from it (`npm run tokens`, runs before `dev` and `build`). |
| `src/App.jsx` | Routes (EzyCourse URL shapes). Pages load on demand. |
| `src/layouts/` | Site layout (header, banners, footer, cart drawer), student dashboard layout, and a minimal checkout layout (no site header or footer). |
| `src/pages/` | Pages. `src/pages/dashboard/` for the student dashboard. |
| `src/components/` | Theme components built from the design system: `AccessGate`, `MiniCart`, `NewsletterForm`, `PreviewBar`, product and checkout parts. |
| `src/data/` | Sample content: school settings, products, plans, people, posts, account. |
| `src/lib/` | `access.js` (access gate + every lock reason), `products.js` (routes, card props, ownership), `commerce.js` (stand-in for the server: quotes, coupons, order bump), `student.js` (the student dashboard: orders, library, bookings, membership and the learning record, all from `src/data/account.js`). |

## Access gate

Sell → Memberships → Access gate in the EzyCourse 2.0 admin: buyers need **Site access** ($49 / year or
$129 lifetime) before they can buy. Checkout adds it as its own "Required" line, and buyers who already
have it never see that line. Free products and events don't need it, and neither do memberships. When access ends,
purchases lock until the buyer renews. Settings live in `src/lib/access.js`; `/site-access` sells it on its own.

## Rules

- Import components from `@/design-system`. Read `src/design-system/README.md` first.
- Style with `var(--…)` tokens only; logical CSS properties only, so `dir="rtl"` works (Arabic in the header).
- Theme is `data-theme="light" | "dark"` on `<html>`; it follows the system unless `localStorage['halvera-theme']` is set.
- Prices and totals come formatted from the server (here `src/lib/commerce.js`); pages never do price maths.
