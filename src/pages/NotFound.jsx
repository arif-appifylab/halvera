import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, TextField, Button } from '@/design-system'

// The 404 page. Self-contained (own section and container) so other pages can render it
// for unknown slugs.
export default function NotFound() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const search = (e) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <section className="sg-section">
      <div className="sg-container sg-container-narrow">
        <h1 className="sg-sr">Page not found</h1>
        <EmptyState
          title="We can't find that page"
          action={
            <div className="pg-stack-sm">
              <form role="search" onSubmit={search}>
                <TextField
                  type="search"
                  iconStart="search"
                  aria-label="Search programmes and products"
                  placeholder="Search programmes and products"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </form>
              <div className="pg-row" style={{ justifyContent: 'center' }}>
                <Button href="/courses">Browse programmes</Button>
                <Button href="/all-products" variant="secondary">All products</Button>
                <Button href="/" variant="ghost" iconStart="home">Home</Button>
              </div>
            </div>
          }
        >
          The link may be out of date, or the page may have moved. Search for what you need, or start from one of these.
        </EmptyState>
      </div>
    </section>
  )
}
