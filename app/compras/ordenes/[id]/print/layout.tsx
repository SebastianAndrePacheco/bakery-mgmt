export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 font-sans">
        {children}
      </body>
    </html>
  )
}
