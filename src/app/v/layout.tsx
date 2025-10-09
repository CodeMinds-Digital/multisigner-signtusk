export default function DocumentViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Clean layout without any headers or footers for document viewing
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
