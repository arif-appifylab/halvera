// Halvera component props. Documentation, not type-checked. Source: components/src/*.jsx
import * as React from 'react';

export type IconName = 'check' | 'chevron-right' | 'chevron-left' | 'chevron-down' | 'arrow-right' | 'arrow-left' | 'x' | 'plus' | 'minus' | 'menu' | 'search' | 'cart' | 'user' | 'lock' | 'calendar' | 'clock' | 'play' | 'pause' | 'headphones' | 'video' | 'file' | 'download' | 'info' | 'alert' | 'check-circle' | 'x-circle' | 'leaf' | 'heart' | 'globe' | 'mail' | 'eye' | 'eye-off' | 'star' | 'sparkle' | 'home' | 'book' | 'settings' | 'bell' | 'card' | 'logout' | 'map-pin' | 'users';
export type ProductType = 'course' | 'cohort' | 'bundle' | 'membership' | 'coaching' | 'community' | 'asset-library' | 'event' | 'appointment' | 'media-library' | 'newsletter' | 'blog';

/** The pill-shaped action button; primary sage for the one main action on a view. */
export interface ButtonProps {
  /** Visual style. Default primary. */ variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'link' | 'inverse' | 'inverse-ghost';
  /** Default md (46px tall). lg for heroes and CTA bands. */ size?: 'sm' | 'md' | 'lg';
  /** Renders an <a>. */ href?: string;
  /** Icon before or after the label; directional icons flip in RTL. */ iconStart?: IconName;
  /** Icon before or after the label; directional icons flip in RTL. */ iconEnd?: IconName;
  /** Full width. */ block?: boolean;
  /** Spinner, aria-busy, not clickable. */ loading?: boolean;
  /** The label. */ children?: ReactNode;
}
export declare const Button: React.FC<ButtonProps>;

/** A round, icon-only button with a required accessible label and an optional count badge. */
export interface IconButtonProps {
  /** Required. */ icon?: IconName;
  /** Required accessible name. */ label?: string;
  /** Default ghost. */ variant?: 'ghost' | 'outline';
  /** 34 or 42px. */ size?: 'sm' | 'md';
  /** Small accent count; hidden at 0. */ badge?: number | string;
}
export declare const IconButton: React.FC<IconButtonProps>;

/** A labelled text input or textarea with hint, error and a show-password toggle. */
export interface TextFieldProps {
  /** Visible label. */ label?: string;
  /** Helper text below. */ hint?: string;
  /** Error message; turns the border danger. */ error?: string;
  /** Adds '(optional)'. */ optional?: boolean;
  /** Input type; 'password' adds the reveal button. */ type?: string;
  /** Renders a textarea. */ multiline?: boolean;
  /** Leading icon (search, mail). */ iconStart?: IconName;
}
export declare const TextField: React.FC<TextFieldProps>;

/** The live checklist of password rules shown under a new-password field. */
export interface PasswordRulesProps {
  /** The password being typed. */ value?: string;
  /** Local change: show the rules even while the value is empty (e.g. after a failed submit). */ show?: boolean;
}
export declare const PasswordRules: React.FC<PasswordRulesProps>;

/** A native select with the system's input styling and a chevron. */
export interface SelectProps {
  /** Visible label. */ label?: string;
  /** The options. */ options?: Array<string | {value,label}>;
  /** First empty option. */ placeholder?: string;
  /** As TextField. */ hint?: string;
  /** As TextField. */ error?: string;
  /** As TextField. */ optional?: string;
}
export declare const Select: React.FC<SelectProps>;

/** A checkbox with label and description, used for agreements and marketing consent. */
export interface CheckboxProps {
  /** Clickable label. */ label?: ReactNode;
  /** Smaller line below. */ description?: ReactNode;
  /** Inline error. */ error?: string;
}
export declare const Checkbox: React.FC<CheckboxProps>;

/** A selectable card for one choice from a few: price picker, plan, cohort run, payment method. */
export interface RadioCardProps {
  /** Radio group name. */ name?: string;
  /** Option value. */ value?: string;
  /** Controlled state. */ checked?: string;
  /** Controlled state. */ onChange?: string;
  /** Main line. */ title?: ReactNode;
  /** Second line. */ description?: ReactNode;
  /** End-aligned, usually the price. */ meta?: ReactNode;
  /** Badge after the title. */ badge?: ReactNode;
  /** Sold out or unavailable. */ disabled?: boolean;
}
export declare const RadioCard: React.FC<RadioCardProps>;

/** An on/off switch row for settings that save instantly. */
export interface SwitchProps {
  /** Setting name. */ label?: string;
  /** What it does. */ description?: string;
  /** State. */ checked?: boolean;
  /** Called with the new value. */ onChange?: (next: boolean) => void;
  /** For emails that can't be turned off (receipts, R-NOT-2). */ disabled?: boolean;
}
export declare const Switch: React.FC<SwitchProps>;

/** Six single-digit cells for email, phone and two-step verification codes. */
export interface OtpInputProps {
  /** Default 6. */ length?: number;
  /** Digits entered. */ value?: string;
  /**  */ onChange?: (code: string) => void;
  /** Wrong or expired code. */ error?: string;
  /** Legend. Default 'Verification code'. */ label?: string;
}
export declare const OtpInput: React.FC<OtpInputProps>;

/** The checkout coupon input with a list of applied codes, each removable. */
export interface CouponFieldProps {
  /** Applied codes and formatted savings. */ applied?: Array<{code, saving}>;
  /**  */ onApply?: (code) => void;
  /**  */ onRemove?: (code) => void;
  /** Why a code was refused. */ error?: string;
}
export declare const CouponField: React.FC<CouponFieldProps>;

/** The sticky public header: wordmark, the Health & wellness nav, Log in and the Book a consultation button. */
export interface SiteHeaderProps {
  /** Text wordmark. */ schoolName?: string;
  /** School logo; replaces the text wordmark. */ logoSrc?: string;
  /** Links. */ nav?: Array<{label, href}>;
  /** href of the current page. */ current?: string;
  /** The header button. */ cta?: {label, href} | null;
  /**  */ cartEnabled?: boolean / number;
  /**  */ cartCount?: boolean / number;
  /** Shows the avatar link to the dashboard. */ signedIn?: boolean / string;
  /** Shows the avatar link to the dashboard. */ userName?: boolean / string;
  /** Language switcher. */ languages?: string;
  /** Language switcher. */ language?: string;
  /** Language switcher. */ onLanguageChange?: string;
  /** Local change: replaces the signed-in avatar link (e.g. an account menu). */ account?: React.ReactNode;
  /** Local change: replaces the "My dashboard" link in the menu panel. */ menuAccount?: React.ReactNode;
}
export declare const SiteHeader: React.FC<SiteHeaderProps>;

/** The dark footer with link columns, the medical disclaimer line and legal links. */
export interface SiteFooterProps {
  /**  */ schoolName?: string;
  /**  */ tagline?: string;
  /**  */ columns?: Array<{title, links}>;
  /** Terms, Privacy, Refund, Disclaimer. */ legal?: Array<{label, href}>;
  /** Short medical disclaimer. */ disclaimer?: string | null;
  /** Optional sign-up form. */ newsletter?: ReactNode;
}
export declare const SiteFooter: React.FC<SiteFooterProps>;

/** The school name set in the display face with a leaf mark, or the school's own logo. */
/** Local change: the Halvera mark. Decorative (aria-hidden); the first leaf follows the text colour, the second is gold. */
export interface LogoMarkProps {
  size?: number;
  className?: string;
}
export declare const LogoMark: React.FC<LogoMarkProps>;

export interface WordmarkProps {
  /**  */ name?: string;
  /** Default '/'. */ href?: string;
  /**  */ logoSrc?: string;
}
export declare const Wordmark: React.FC<WordmarkProps>;

/** Underline or pill tabs for switching views: product-type tabs, dashboard tabs, upcoming/past. */
export interface TabsProps {
  /**  */ tabs?: Array<string | {value, label, count?}>;
  /** Active tab. */ value?: string;
  /**  */ onChange?: (value) => void;
  /**  */ variant?: 'underline' | 'pill';
  /** aria-label for the tablist. */ label?: string;
}
export declare const Tabs: React.FC<TabsProps>;

/** A compact two-to-four way toggle, used for the monthly / yearly / lifetime switch on Memberships. */
export interface SegmentedToggleProps {
  /**  */ options?: Array<string | {value, label, note?}>;
  /**  */ value?: string;
  /**  */ onChange?: (value) => void;
  /** aria-label. */ label?: string;
}
export declare const SegmentedToggle: React.FC<SegmentedToggleProps>;

/** A trail of links above titles on condition, blog and product pages. */
export interface BreadcrumbsProps {
  /**  */ items?: Array<{label, href?}>;
}
export declare const Breadcrumbs: React.FC<BreadcrumbsProps>;

/** Numbered page links for the blog, catalogue and long dashboard tables. */
export interface PaginationProps {
  /**  */ page?: number;
  /**  */ pages?: number;
  /**  */ onChange?: (page) => void;
}
export declare const Pagination: React.FC<PaginationProps>;

/** The student dashboard sidebar with the learner, their level and the menu. */
export interface DashboardNavProps {
  /**  */ items?: Array<{label, href, icon}>;
  /** Current href. */ current?: string;
  /**  */ userName?: string;
  /** Level name; omit when gamification is off. */ level?: string;
}
export declare const DashboardNav: React.FC<DashboardNavProps>;

/** An inline message box in info, success, warning, danger or neutral tone. */
export interface NoticeProps {
  /**  */ tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  /**  */ title?: string;
  /** Body text. */ children?: ReactNode;
  /** A button or link. */ action?: ReactNode;
  /** Shows a close button. */ onDismiss?: () => void;
}
export declare const Notice: React.FC<NoticeProps>;

/** The 'no longer available' block that keeps a product's page alive: reason, title, image and next step. */
export interface StateNoticeProps {
  /** Headline: 'This event has ended'. */ reason?: string;
  /** What happened and when. */ detail?: string;
  /** Product title. */ title?: string;
  /** Product image. */ image?: string;
  /** Next steps. */ actions?: ReactNode;
  /** Extra content (a waitlist form). */ children?: ReactNode;
}
export declare const StateNotice: React.FC<StateNoticeProps>;

/** A calm placeholder for empty lists with one way forward. */
export interface EmptyStateProps {
  /** Default leaf. */ icon?: IconName;
  /**  */ title?: string;
  /** One sentence. */ children?: ReactNode;
  /** Usually one Button. */ action?: ReactNode;
}
export declare const EmptyState: React.FC<EmptyStateProps>;

/** A shimmering placeholder block for loading states. */
export interface SkeletonProps {
  /**  */ width?: string | number;
  /** Default 16. */ height?: string | number;
  /**  */ radius?: string;
}
export declare const Skeleton: React.FC<SkeletonProps>;

/** A labelled progress bar for course completion, sessions done and level progress. */
export interface ProgressBarProps {
  /**  */ value?: number;
  /** Default 100. */ max?: number;
  /**  */ label?: string;
  /** Default true. */ showValue?: boolean;
  /**  */ tone?: 'primary' | 'accent';
}
export declare const ProgressBar: React.FC<ProgressBarProps>;

/** Numbered steps for multi-step flows: booking, checkout, the cancel flow, onboarding. */
export interface StepperProps {
  /**  */ steps?: Array<string | {label, description?}>;
  /** Zero-based. */ current?: number;
  /**  */ orientation?: 'horizontal' | 'vertical';
}
export declare const Stepper: React.FC<StepperProps>;

/** A centred dialog with title, body and footer actions; closes on Escape and backdrop click. */
export interface ModalProps {
  /**  */ open?: boolean;
  /**  */ onClose?: () => void;
  /**  */ title?: string;
  /**  */ children?: ReactNode;
  /** Actions, end-aligned. */ footer?: ReactNode;
  /**  */ size?: 'sm' | 'md' | 'lg';
}
export declare const Modal: React.FC<ModalProps>;

/** A side panel for the cart and the mobile dashboard menu; slides from the inline end. */
export interface DrawerProps {
  /**  */ open?: boolean;
  /**  */ onClose?: () => void;
  /**  */ title?: string;
  /**  */ children?: ReactNode;
  /**  */ footer?: ReactNode;
}
export declare const Drawer: React.FC<DrawerProps>;

/** Expandable questions and answers for the FAQ, programme details and the disclaimer. */
export interface AccordionProps {
  /**  */ items?: Array<{question, answer}>;
  /** Index open at start; -1 none. */ defaultOpen?: number;
}
export declare const Accordion: React.FC<AccordionProps>;

/** Days, hours, minutes and seconds until a start time. */
export interface CountdownProps {
  /** Target time. */ to?: string | Date;
  /** Default 'Starts in'. */ label?: string;
}
export declare const Countdown: React.FC<CountdownProps>;

/** The system's line icon set: 1.75px strokes on a 24px grid, drawn with currentColor. */
export interface IconProps {
  /** One of iconNames. */ name?: IconName;
  /** Default 20. */ size?: number;
  /** Accessible name; omit for decorative. */ label?: string;
}
export declare const Icon: React.FC<IconProps>;

/** A small label for types, states and highlights. */
export interface BadgeProps {
  /**  */ tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  /**  */ icon?: IconName;
  /**  */ children?: ReactNode;
}
export declare const Badge: React.FC<BadgeProps>;

/** A Badge that maps a platform status word to its tone and icon. */
export interface StatusBadgeProps {
  /** e.g. 'Paid', 'Past due', 'Cancelling', 'Expired'. */ status?: string;
  /** Override the label, e.g. 'Cancelling until 3 Mar'. */ children?: ReactNode;
}
export declare const StatusBadge: React.FC<StatusBadgeProps>;

/** A round photo or initials for practitioners, clients and the signed-in student. */
export interface AvatarProps {
  /**  */ src?: string;
  /** Used for initials and the accessible name. */ name?: string;
  /**  */ size?: 'sm' | 'md' | 'lg' | 'xl';
}
export declare const Avatar: React.FC<AvatarProps>;

/** The basic rounded container on raised, sunken, sage or clay ground. */
export interface CardProps {
  /** Element, default div. */ as?: string;
  /**  */ tone?: 'raised' | 'sunken' | 'sage' | 'clay';
  /**  */ padding?: 'sm' | 'md' | 'lg';
  /**  */ interactive?: boolean;
}
export declare const Card: React.FC<CardProps>;

/** A formatted price with interval, installments, strike-through and notes. */
export interface PriceTagProps {
  /** Formatted amount, or 0 / 'Free'. */ amount?: string | 0;
  /** 'month', 'year'… */ interval?: string;
  /** Number of payments. */ installments?: number;
  /** Installment total. */ total?: string;
  /** Strike-through price. */ strike?: string;
  /** Access length, trial. */ note?: string;
  /**  */ size?: 'sm' | 'md' | 'lg';
}
export declare const PriceTag: React.FC<PriceTagProps>;

/** The catalogue card for any of the 12 product types, with every visibility and availability state. */
export interface ProductCardProps {
  /** course, cohort, bundle, membership, coaching, community, asset-library, event, appointment, media-library, newsletter, blog. */ type?: ProductType;
  /**  */ title?: string;
  /**  */ href?: string;
  /**  */ image?: string;
  /**  */ summary?: string;
  /** Duration, sessions, format. */ meta?: Array<{icon?, label}>;
  /**  */ price?: PriceTagProps;
  /**  */ visibility?: 'public' | 'membership' | 'private';
  /**  */ availability?: 'available' | 'sold-out' | 'sales-ended' | 'enrolment-closed' | 'owned';
  /** 'Lifetime access'. */ access?: string;
  /** Overrides the link (opens plan picker). */ onPrimary?: () => void;
}
export declare const ProductCard: React.FC<ProductCardProps>;

/** A membership plan card for /memberships: price, trial, what's included and allowances. */
export interface PlanCardProps {
  /**  */ name?: string;
  /**  */ description?: string;
  /**  */ price?: PriceTagProps;
  /**  */ featured?: boolean / string;
  /**  */ featuredLabel?: boolean / string;
  /**  */ features?: string[];
  /**  */ allowances?: string[];
  /** '7-day free trial'. */ trial?: string;
  /**  */ cta?: string;
  /**  */ ctaHref?: string;
  /**  */ current?: boolean;
  /**  */ upgrade?: boolean;
}
export declare const PlanCard: React.FC<PlanCardProps>;

/** A client story in the display italic with name, detail and optional stars. */
export interface TestimonialProps {
  /**  */ quote?: string;
  /**  */ name?: string;
  /** Programme or context. */ detail?: string;
  /**  */ avatar?: string;
  /**  */ rating?: 1–5;
}
export declare const Testimonial: React.FC<TestimonialProps>;

/** A full-width page band with container, eyebrow, title and intro. */
export interface SectionProps {
  /**  */ tone?: 'surface' | 'raised' | 'sunken' | 'sage' | 'clay';
  /**  */ eyebrow?: string;
  /**  */ title?: string;
  /**  */ intro?: string;
  /**  */ align?: 'start' | 'center';
  /**  */ width?: 'default' | 'narrow' | 'prose' | 'wide';
  /** Anchor. */ id?: string;
}
export declare const Section: React.FC<SectionProps>;

/** The page-opening block: headline with an optional highlighted phrase, subline, CTAs and an arched photo. */
export interface HeroProps {
  /**  */ eyebrow?: string;
  /**  */ title?: string;
  /**  */ subtitle?: string;
  /** Phrase inside title to emphasise. */ highlight?: string;
  /**  */ primary?: {label, href};
  /**  */ secondary?: {label, href};
  /**  */ image?: string;
  /**  */ imageAlt?: string;
  /**  */ trust?: string;
  /**  */ layout?: 'split' | 'center';
}
export declare const Hero: React.FC<HeroProps>;

/** Numbered steps for 'How it works in 3 steps'. */
export interface FeatureStepsProps {
  /**  */ steps?: Array<{title, text}>;
}
export declare const FeatureSteps: React.FC<FeatureStepsProps>;

/** An icon, title and short text card for 'What we help with' and value pillars. */
export interface FeatureCardProps {
  /**  */ icon?: IconName;
  /**  */ title?: string;
  /**  */ text?: string;
  /**  */ href?: string;
  /**  */ linkLabel?: string;
}
export declare const FeatureCard: React.FC<FeatureCardProps>;

/** Two columns: who this is for, and who it's not for. */
export interface FitListProps {
  /**  */ forTitle?: string;
  /**  */ notTitle?: string;
  /**  */ fits?: string[];
  /**  */ notFits?: string[];
}
export declare const FitList: React.FC<FitListProps>;

/** A practitioner's photo, role, credentials and short bio. */
export interface PractitionerCardProps {
  /**  */ name?: string;
  /**  */ role?: string;
  /**  */ bio?: string;
  /**  */ credentials?: string[];
  /**  */ photo?: string;
  /** Instructor profile. */ href?: string;
}
export declare const PractitionerCard: React.FC<PractitionerCardProps>;

/** The rounded closing band that asks for the consultation, in inverse or sage. */
export interface CtaBandProps {
  /**  */ title?: string;
  /**  */ text?: string;
  /**  */ primary?: {label, href};
  /**  */ secondary?: {label, href};
  /**  */ tone?: 'inverse' | 'sage';
}
export declare const CtaBand: React.FC<CtaBandProps>;

/** The short medical disclaimer with a link to /disclaimer. */
export interface DisclaimerProps {
  /** Disclaimer text. */ children?: ReactNode;
  /** Default '/disclaimer'. */ href?: string | null;
}
export declare const Disclaimer: React.FC<DisclaimerProps>;

/** The clay 'Free guide' block that leads into the funnel opt-in. */
export interface LeadMagnetProps {
  /**  */ title?: string;
  /**  */ text?: string;
  /** Guide cover. */ image?: string;
  /** The opt-in form. */ children?: ReactNode;
}
export declare const LeadMagnet: React.FC<LeadMagnetProps>;

/** The checkout and cart summary: lines, coupons, tax and total. */
export interface OrderSummaryProps {
  /**  */ lines?: Array<{name, amount, detail?, kind?, image?}>;
  /**  */ discounts?: Array<{code, saving}>;
  /**  */ subtotal?: string;
  /**  */ tax?: string;
  /**  */ total?: string;
  /**  */ currencyNote?: string;
  /**  */ footer?: ReactNode;
}
export declare const OrderSummary: React.FC<OrderSummaryProps>;

/** Day tabs and time slots for booking a consultation, in the visitor's time zone. */
export interface SlotPickerProps {
  /**  */ days?: Array<{date, weekday, day, label?, slots: Array<string | {time, spots?, full?}>}>;
  /** 'date time' key. */ value?: string;
  /**  */ onChange?: (key) => void;
  /** Display name. */ timezone?: string;
}
export declare const SlotPicker: React.FC<SlotPickerProps>;

/** The dashboard table for orders, transactions, subscriptions, enrolments and submissions. */
export interface DataTableProps {
  /**  */ columns?: Array<{key, label, align?, render?}>;
  /**  */ rows?: object[];
  /** Shown when rows is empty. */ empty?: ReactNode;
  /** Accessible name. */ caption?: string;
}
export declare const DataTable: React.FC<DataTableProps>;

/** A curriculum row with type icon, duration and done, locked-by-drip, locked-by-prerequisite and preview states. */
export interface LessonRowProps {
  /**  */ title?: string;
  /**  */ duration?: string;
  /**  */ type?: 'video' | 'audio' | 'text' | 'pdf' | 'download' | 'live' | 'quiz' | 'assignment';
  /**  */ state?: 'open' | 'done' | 'drip' | 'prereq';
  /**  */ unlockDate?: string;
  /**  */ preview?: boolean;
  /**  */ current?: boolean;
  /**  */ href?: string;
}
export declare const LessonRow: React.FC<LessonRowProps>;

/** A compact player for guided audio episodes in the media library. */
export interface AudioPlayerProps {
  /**  */ title?: string;
  /**  */ subtitle?: string;
  /** Audio URL. */ src?: string;
  /**  */ duration?: string;
  /**  */ cover?: string;
}
export declare const AudioPlayer: React.FC<AudioPlayerProps>;

/** A small figure tile for the dashboard home: sessions this week, streak, level. */
export interface StatTileProps {
  /**  */ label?: string;
  /**  */ value?: string;
  /**  */ hint?: string;
  /**  */ icon?: IconName;
}
export declare const StatTile: React.FC<StatTileProps>;

export declare const iconNames: IconName[];
