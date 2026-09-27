import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Et vindu over siden, bygget på nettleserens innebygde <dialog>.
 * Esc lukker, klikk på den mørke bakgrunnen lukker, og tastaturfokus
 * holdes inne i vinduet mens det er åpent.
 */
export function Modal({ onClose, label, width = '28rem', children }: { onClose: () => void; label: string; width?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    // showModal() setter fokus på første knapp. Vil et felt ha fokus, merkes det med data-autofocus.
    dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto max-h-[calc(100dvh-2rem)] overflow-x-hidden rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-ink/25"
      style={{ width: `min(${width}, calc(100% - 2rem))` }}
    >
      <div className="p-6 sm:p-8">{children}</div>
    </dialog>
  )
}
