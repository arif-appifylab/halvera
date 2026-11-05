import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ViewerProvider } from '@/app/viewer.jsx'
import { CartProvider } from '@/app/cart.jsx'
import SiteLayout from '@/layouts/SiteLayout.jsx'
import DashboardLayout from '@/layouts/DashboardLayout.jsx'
import CheckoutLayout from '@/layouts/CheckoutLayout.jsx'
import { PRODUCT_ROUTES } from '@/lib/products.js'

import Home from '@/pages/Home.jsx'
const Conditions = lazy(() => import('@/pages/Conditions.jsx'))
const Condition = lazy(() => import('@/pages/Condition.jsx'))
const About = lazy(() => import('@/pages/About.jsx'))
const Contact = lazy(() => import('@/pages/Contact.jsx'))
const Legal = lazy(() => import('@/pages/Legal.jsx'))
const Blog = lazy(() => import('@/pages/Blog.jsx'))
const BlogPost = lazy(() => import('@/pages/BlogPost.jsx'))
const Catalog = lazy(() => import('@/pages/Catalog.jsx'))
const Product = lazy(() => import('@/pages/Product.jsx'))
const ProductAccess = lazy(() => import('@/pages/ProductAccess.jsx'))
const Learn = lazy(() => import('@/pages/Learn.jsx'))
const QuizAttempt = lazy(() => import('@/pages/QuizAttempt.jsx'))
const Library = lazy(() => import('@/pages/library/Library.jsx'))
const NewsletterHome = lazy(() => import('@/pages/newsletter/NewsletterHome.jsx'))
const NewsletterPost = lazy(() => import('@/pages/newsletter/NewsletterPost.jsx'))
const Search = lazy(() => import('@/pages/Search.jsx'))
const CheckoutRecover = lazy(() => import('@/pages/CheckoutRecover.jsx'))
const LibraryFile = lazy(() => import('@/pages/library/LibraryFile.jsx'))
const Memberships = lazy(() => import('@/pages/Memberships.jsx'))
const SiteAccess = lazy(() => import('@/pages/SiteAccess.jsx'))
const Booking = lazy(() => import('@/pages/Booking.jsx'))
const Checkout = lazy(() => import('@/pages/Checkout.jsx'))
const Cart = lazy(() => import('@/pages/Cart.jsx'))
const Auth = lazy(() => import('@/pages/Auth.jsx'))
const VerifyCertificate = lazy(() => import('@/pages/VerifyCertificate.jsx'))
const NotFound = lazy(() => import('@/pages/NotFound.jsx'))
const ThemeStates = lazy(() => import('@/pages/ThemeStates.jsx'))
const Palettes = lazy(() => import('@/pages/Palettes.jsx'))
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome.jsx'))
const MyLibrary = lazy(() => import('@/pages/dashboard/Library.jsx'))
const Membership = lazy(() => import('@/pages/dashboard/Membership.jsx'))
const Bookings = lazy(() => import('@/pages/dashboard/Bookings.jsx'))
const Profile = lazy(() => import('@/pages/dashboard/Profile.jsx'))
const Payments = lazy(() => import('@/pages/dashboard/Payments.jsx'))
const Notes = lazy(() => import('@/pages/dashboard/Notes.jsx'))
const Settings = lazy(() => import('@/pages/dashboard/Settings.jsx'))

// Pages load on demand; Home is in the main bundle.

// Design-system links are plain <a href>. Route same-site clicks through the router.
function LinkInterceptor() {
  const navigate = useNavigate()
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target.closest('a[href]')
      if (!a || a.target || a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (!href.startsWith('/') || href.startsWith('//')) return
      e.preventDefault()
      navigate(href)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [navigate])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ViewerProvider>
        <CartProvider>
          <LinkInterceptor />
          <ScrollToTop />
          <Suspense fallback={null}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Home />} />
              <Route path="conditions" element={<Conditions />} />
              <Route path="conditions/:slug" element={<Condition />} />
              <Route path="about-us" element={<About />} />
              <Route path="contact-us" element={<Contact />} />
              <Route path="terms-of-use" element={<Legal page="terms" />} />
              <Route path="privacy-policy" element={<Legal page="privacy" />} />
              <Route path="refund-policy" element={<Legal page="refund" />} />
              <Route path="blog" element={<Blog />} />
              <Route path="blog/:slug" element={<BlogPost />} />
              <Route path="courses" element={<Catalog scope="courses" />} />
              <Route path="all-products" element={<Catalog scope="all" />} />
              {PRODUCT_ROUTES.map((type) => (
                <Route key={type} path={`${type}/:slug`} element={<Product />} />
              ))}
              {PRODUCT_ROUTES.map((type) => (
                <Route key={type + '-open'} path={`${type}/:slug/open`} element={<ProductAccess />} />
              ))}
              <Route path="newsletter/:slug" element={<NewsletterHome />} />
              <Route path="newsletter/:slug/:postSlug" element={<NewsletterPost />} />
              <Route path="search" element={<Search />} />
              <Route path="cart" element={<Cart />} />
              <Route path="asset-library/:slug" element={<Library />} />
              <Route path="asset-library/:slug/category/:categoryId" element={<Library />} />
              <Route path="asset-library/:slug/folder/:folderId" element={<Library />} />
              <Route path="asset-library/:slug/file/:fileId" element={<LibraryFile />} />
              <Route path="course/:slug/learn/:lessonId" element={<Learn />} />
              <Route path="course/:slug/learn/:lessonId/quiz" element={<QuizAttempt />} />
              <Route path="memberships" element={<Memberships />} />
              <Route path="site-access" element={<SiteAccess />} />
              <Route path="appointment/:slug" element={<Booking />} />
              <Route path="login" element={<Auth mode="login" />} />
              <Route path="signup" element={<Auth mode="signup" />} />
              <Route path="verify-email" element={<Auth mode="verify" />} />
              <Route path="forgot-password" element={<Auth mode="forgot" />} />
              <Route path="verify" element={<VerifyCertificate />} />
              <Route path="theme-states" element={<ThemeStates />} />
              <Route path="palettes" element={<Palettes />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route element={<CheckoutLayout />}>
              <Route path="checkout/:id" element={<Checkout />} />
              <Route path="checkout/recover/:token" element={<CheckoutRecover />} />
            </Route>
            <Route path="student/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="profile/enrollments" element={<MyLibrary />} />
              <Route path="memberships" element={<Membership />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/payments" element={<Payments />} />
              <Route path="notes" element={<Notes />} />
              {/* Older addresses: appointments and tickets are Bookings now; achievements are on the profile. */}
              <Route path="appointments" element={<Navigate to="/student/dashboard/bookings?type=appointment" replace />} />
              <Route path="tickets" element={<Navigate to="/student/dashboard/bookings?type=event" replace />} />
              <Route path="achievements" element={<Navigate to="/student/dashboard/profile#achievements" replace />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          </Suspense>
        </CartProvider>
      </ViewerProvider>
    </BrowserRouter>
  )
}
