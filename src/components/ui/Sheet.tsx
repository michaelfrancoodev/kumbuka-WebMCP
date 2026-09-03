import { clsx } from 'clsx'

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg bg-[#16160a] border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto no-scrollbar animate-up"
        onClick={e => e.stopPropagation()}
      >
        {title && <h3 className="font-display text-lg font-semibold mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border', className)}>
      {children}
    </span>
  )
}
