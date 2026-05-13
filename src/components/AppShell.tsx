import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a1a]">
      <Sidebar />
      <main className="flex-1 py-8 px-6 flex flex-col items-center">
        {children}
      </main>
    </div>
  )
}
