import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
}

export function Button({ variant = 'primary', size = 'md', full, className, children, ...props }: Props) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'primary' && 'bg-white text-black hover:bg-white/90',
        variant === 'secondary' && 'bg-white/5 text-white border border-white/10 hover:bg-white/10',
        variant === 'danger' && 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
        variant === 'ghost' && 'text-white/70 hover:text-white hover:bg-white/5',
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
