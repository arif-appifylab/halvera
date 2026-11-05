import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import PreviewBar from '@/components/PreviewBar.jsx'
import '@/styles/pages.css'

// Checkout stands on its own: no site header, nav or footer, so buyers stay focused.
export default function CheckoutLayout() {
  return (
    <>
      <main id="main">
        <Suspense fallback={null}><Outlet /></Suspense>
      </main>
      <PreviewBar />
    </>
  )
}
