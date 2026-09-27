/**
 * Designlabben: bytt mellom designforslagene via adressen (#/design/magasin osv.).
 * "?embed" skjuler menyen, som brukes når forslagene vises side om side.
 */
import { useEffect, useRef, useState } from 'react'
import { MagazineHome } from './MagazineHome'
import { PlannerHome } from './PlannerHome'
import { UrverkHome } from './UrverkHome'

const designs = [
  { id: 'magasin', label: 'Magasin', Page: MagazineHome },
  { id: 'planner', label: 'Luksuriøs planner', Page: PlannerHome },
  { id: 'urverk', label: 'Urverk', Page: UrverkHome },
]

export function DesignLab({ hash }: { hash: string }) {
  const [path, query] = hash.replace(/^#\//, '').split('?')
  const id = path.split('/')[1] || 'magasin'
  const embed = query === 'embed'
  const design = designs.find((d) => d.id === id)

  return (
    <>
      {id === 'sammenlign' ? <Compare /> : design ? <design.Page key={id} /> : null}
      {!embed && <Switcher current={id} />}
    </>
  )
}

function Switcher({ current }: { current: string }) {
  const items = [...designs.map((d, i) => ({ href: `#/design/${d.id}`, id: d.id, label: `${i + 1} · ${d.label}` })), { href: '#/design/sammenlign', id: 'sammenlign', label: 'Side om side' }, { href: '#/', id: 'na', label: 'Nåværende' }]
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-ink/90 p-1 shadow-[0_10px_30px_-10px_rgba(50,45,41,0.6)] backdrop-blur">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs tracking-wide transition-colors ${item.id === current ? 'bg-paper text-ink' : 'text-paper/80 hover:text-paper'}`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

/**
 * Alle tre forslagene ved siden av hverandre. Hvert forslag vises i en iframe
 * som tror den er 1280 px bred, og skaleres ned så den passer i kolonnen.
 */
function Compare() {
  const PAGE_WIDTH = 1280
  const PAGE_HEIGHT = 2300
  const columnRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    const el = columnRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setScale(el.clientWidth / PAGE_WIDTH))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-card px-4 pt-6 pb-28">
      <div className="grid grid-cols-3 gap-4">
        {designs.map((d, i) => (
          <div key={d.id} ref={i === 0 ? columnRef : undefined}>
            <a href={`#/design/${d.id}`} className="mb-2 block text-center text-xs tracking-[0.3em] text-muted uppercase hover:text-ink">
              {i + 1} · {d.label}
            </a>
            <div className="overflow-hidden rounded-lg border border-line bg-paper" style={{ height: PAGE_HEIGHT * scale }}>
              <iframe
                title={d.label}
                src={`/#/design/${d.id}?embed`}
                className="origin-top-left border-0"
                style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${scale})` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
