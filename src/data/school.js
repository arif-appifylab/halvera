// The school's settings. In EzyCourse these come from the admin; every feature is switched on here.

export const school = {
  name: 'Halvera',
  tagline: 'Gentle, practitioner-led care for body and mind.',
  email: 'hello@halvera.example',
  phone: '+44 20 7946 0321',
  address: '14 Linden Row, Bristol BS1 4QA',
  timezone: 'GMT+1 (London)',
  consultation: { label: 'Book a consultation', href: '/appointment/consultation' },
  features: {
    cart: true,
    memberships: true,
    blog: true,
    appointments: true,
    languages: true,
  },
  languages: [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'bn', label: 'বাংলা' },
  ],
}

export const nav = [
  { label: 'Programmes', href: '/courses' },
  { label: 'Health topics', href: '/conditions' },
  { label: 'Membership', href: '/memberships' },
  { label: 'About us', href: '/about-us' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact us', href: '/contact-us' },
]

export const footerColumns = [
  {
    title: 'Programmes',
    links: [
      { label: 'All programmes', href: '/courses' },
      { label: 'All products', href: '/all-products' },
      { label: 'Membership', href: '/memberships' },
      { label: 'Book a consultation', href: '/appointment/consultation' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'About us', href: '/about-us' },
      { label: 'Health topics', href: '/conditions' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact us', href: '/contact-us' },
      { label: 'Log in', href: '/login' },
      { label: 'Create an account', href: '/signup' },
    ],
  },
]

export const legal = [
  { label: 'Terms of use', href: '/terms-of-use' },
  { label: 'Privacy policy', href: '/privacy-policy' },
  { label: 'Refund policy', href: '/refund-policy' },
]

export const social = [
  { label: 'Instagram', href: 'https://instagram.com/' },
  { label: 'YouTube', href: 'https://youtube.com/' },
  { label: 'Facebook', href: 'https://facebook.com/' },
]
