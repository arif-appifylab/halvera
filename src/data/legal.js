// Legal pages: terms of use, privacy policy, refund policy.
// Generic, plain-English text a school would replace with its own. Blocks render in order:
// { h2 }, { h3 }, { p }, { ul: [] }.
import { school } from '@/data/school.js'
import { siteAccess } from '@/lib/access.js'

// Sections about the access gate only appear while "Require site access to buy" is on.
const gate = (...blocks) => (siteAccess.enabled ? blocks : [])

export const legalUpdated = '1 Oct 2026'

export const legalPages = {

  terms: {
    href: '/terms-of-use',
    label: 'Terms of use',
    title: 'Terms of use',
    intro: 'The agreement between you and us when you use this website and our programmes.',
    blocks: [
      { h2: 'About these terms' },
      { p: `These terms apply when you browse this website, create an account, or buy or join anything from ${school.name} ("we", "us"). By using the site you agree to them. If you do not agree, do not use the site.` },
      { h2: 'Your account' },
      { ul: [
        'You need to be 18 or over to create an account.',
        'Keep your login details private. You are responsible for activity on your account.',
        'Give us accurate details and keep your email address up to date so you get booking and billing messages.',
        'We confirm every new account by email before you can open your programmes.',
      ] },
      ...gate(
        { h2: 'Site access' },
        { p: 'Some purchases need active site access, which is added at checkout as its own line. If your site access ends, the products you bought stay in your account but are locked until you renew. Nothing you have done is lost.' },
      ),
      { h2: 'Using our content' },
      { p: 'Programmes, recordings, guides and worksheets are for your own personal use. You may not copy, share, resell or publish them, or share your login with anyone else. We may close accounts that do.' },
      { h2: 'Community and sessions' },
      { p: 'Be kind and respectful. Keep what others share in the community and in group sessions confidential. We may remove posts or members that make the space feel unsafe.' },
      { h2: 'Payments and subscriptions' },
      { p: 'Prices are shown at checkout before you pay, including any tax. Subscriptions and memberships renew automatically until you cancel. You can cancel any time from your dashboard. Our refund policy explains when you can get your money back.' },
      { h2: 'Changes and contact' },
      { p: `We may update these terms from time to time and will show the date at the top of this page. For questions, write to ${school.email}.` },
      { p: `${school.name}, ${school.address}. These terms are governed by the laws of England and Wales.` },
    ],
  },

  privacy: {
    href: '/privacy-policy',
    label: 'Privacy policy',
    title: 'Privacy policy',
    intro: 'What we collect, why we collect it and the choices you have.',
    blocks: [
      { h2: 'Who we are' },
      { p: `${school.name} (${school.address}) is responsible for the personal data you share with us. If you have any questions, email ${school.email}.` },
      { h2: 'What we collect' },
      { ul: [
        'Account details: your name, email address and password.',
        'Order details: what you bought, billing address and payment status. Card details are handled by our payment provider; we never see or store your full card number.',
        'Booking and intake details: the answers you give before a consultation, which can include health information.',
        'Learning activity: lessons completed, quiz results, certificates and community posts.',
        'Technical data: device, browser and pages visited, through essential cookies and, if you agree, analytics cookies.',
      ] },
      { h2: 'Health information' },
      { p: 'Anything you tell us about your health is treated as special category data. We only use it to prepare for and run your sessions, only share it with the practitioner who supports you, and only with your explicit consent.' },
      { h2: 'How we use your data' },
      { ul: [
        'To give you access to what you bought and run your account.',
        'To send booking confirmations, reminders, receipts and important account messages.',
        'To send news and offers, but only if you ticked the marketing box. You can unsubscribe in one click.',
        'To improve our programmes and keep the site secure.',
      ] },
      { h2: 'Who we share it with' },
      { p: 'We use trusted providers for hosting, payments, video calls and email. They process data on our behalf and only as we instruct. We never sell your data.' },
      { h2: 'How long we keep it' },
      { p: 'We keep account and learning data while your account is open, and order records for six years for tax purposes. Intake forms are deleted two years after your last session unless you ask us to keep them.' },
      { h2: 'Your rights' },
      { p: `You can ask to see, correct, download or delete your data, or object to how we use it. Email ${school.email} and we will reply within one month. You can also complain to the Information Commissioner's Office (ico.org.uk).` },
    ],
  },

  refund: {
    href: '/refund-policy',
    label: 'Refund policy',
    title: 'Refund policy',
    intro: 'When you can get your money back, and how to ask.',
    blocks: [
      { p: 'We want you to feel sure about what you buy. If something is not right for you, these are the rules we follow. Refunds go back to the original payment method, usually within 5 to 10 working days.' },
      { h2: 'Programmes and courses' },
      { p: 'You can ask for a full refund within 14 days of purchase. After that, programmes are not refundable. If you paid in instalments, a refund cancels the remaining payments.' },
      { h2: 'Memberships and subscriptions' },
      { ul: [
        'Cancel any time from your dashboard. You keep access until the end of the period you paid for.',
        'We do not refund part-used billing periods.',
        'If you cancel during a free trial, you are not charged.',
      ] },
      { h2: 'Events and workshops' },
      { p: 'Events are fully refundable up to 7 days before the start date. After that, you can transfer your place to someone else. If we cancel or move an event, you can choose a full refund.' },
      { h2: 'Consultations' },
      { p: 'You can cancel or reschedule a consultation up to 4 hours before it starts from your dashboard, and paid sessions cancelled in time are refunded. Missed sessions or later cancellations are not refunded.' },
      { h2: 'Pre-orders' },
      { p: 'You can cancel a pre-order for a full refund at any time until the product is released.' },
      ...gate(
        { h2: 'Site access' },
        { p: 'Site access is refundable within 14 days of purchase if you have not used it to open or buy anything. Once used, it is not refundable, but it will not renew if you cancel.' },
      ),
      { h2: 'How to ask for a refund' },
      { p: `Email ${school.email} with your order number from the payments page of your dashboard. We reply within 2 working days. This does not affect your statutory rights.` },
    ],
  },
}
