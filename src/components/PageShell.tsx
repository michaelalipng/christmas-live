// components/PageShell.tsx
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-3xl">{children}</div>
    </main>
  )
}

