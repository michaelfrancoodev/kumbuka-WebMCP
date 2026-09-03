import { clsx } from 'clsx'
import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className, hover, children, ...props }: Props) {
  return (
    <div
      className={clsx(
        'surface transition-all duration-200',
        hover && 'hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
