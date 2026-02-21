import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import logo from './assets/icon.png'

const icon = (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <circle cx="14" cy="14" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="14" cy="14" r="3" fill="currentColor" />
    <path d="M6 6l4 4M22 22l-4-4M22 6l-4 4M6 22l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

function Layout() {
  const location = useLocation()
  return (
    <>
      <nav style={{
        padding: '16px 24px',
        background: '#0a0a0a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 600, fontSize: '1.125rem' }}>
          <img src={logo} alt="Live Lens" style={{ width: '28px', height: '28px' }} />
          <span>Live Lens</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/" style={{ fontWeight: location.pathname === '/' ? 500 : 400 }}>
            Home
          </Link>
          <Link to="/about" style={{ fontWeight: location.pathname === '/about' ? 500 : 400 }}>
            About
          </Link>
          <a href="https://github.com/andrewzapps/live-lens" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </nav>
      <main style={{ padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}

export default App
