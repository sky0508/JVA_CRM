export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">JVA CRM</h1>
        <a href="/templates" className="text-sm text-gray-500 hover:text-gray-700">テンプレート</a>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
