// components/PageShell.tsx
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-start justify-center p-6" style={{ background: 'linear-gradient(180deg, #c8e4f0 0%, #e8f4f8 50%, #f0f8fa 100%)', backgroundAttachment: 'fixed' }}>
      <div className="w-full max-w-3xl">{children}</div>
    </main>
  )
}

