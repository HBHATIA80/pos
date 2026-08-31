import type { ReactNode } from 'react'

export function ModalFrame({
  children,
  className = '',
  ...props
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`mx-auto flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ${className}`}>
      {children}
    </div>
  )
}

export function SplitPane({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`grid min-h-0 flex-1 ${className}`}>{children}</div>
}

export function ScrollPanel({
  children,
  className = '',
  ...props
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={`min-h-0 overflow-y-auto ${className}`}>
      {children}
    </section>
  )
}
