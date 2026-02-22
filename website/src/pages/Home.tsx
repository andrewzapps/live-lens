export default function Home() {
  return (
    <>
      <h1
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          lineHeight: 1.15,
          marginBottom: '1rem',
          letterSpacing: '-0.02em',
          paddingTop: '4rem',
        }}
      >
        The web, spoken.
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.125rem', margin: 0 }}>
        Ask anything about any page using your voice. Live Lens answers out loud or in large on-screen text to assist blind and low-vision users.
      </p>
      <div style={{ marginTop: '2.5rem', maxWidth: '1100px', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px' }}>
        <iframe
          width="100%"
          height="100%"
          style={{ border: 'none', display: 'block' }}
          src="https://www.youtube.com/embed/XkPGsGAQFnI"
          title="Live Lens Demo"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </>
  )
}
