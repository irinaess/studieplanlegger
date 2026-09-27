/**
 * Fargehjelp.
 *
 * Fagfargene kan endres av brukeren (nytt semester = nye fag og farger).
 * Noen farger, som taupe (#AC9C8D), er for lyse til å brukes som tekst
 * på den lyse bakgrunnen. `readableOn` gjør fargen gradvis mørkere til
 * teksten blir lett å lese (WCAG-kontrast 4.5:1).
 */

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** Relativ lysstyrke etter WCAG-formelen (0 = svart, 1 = hvit). */
function luminance(rgb: RGB): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Kontrastforhold mellom to farger (1 = ingen kontrast, 21 = svart på hvitt). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  const [light, dark] = la > lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

/** Mørkner fargen i små steg til den har nok kontrast mot bakgrunnen. */
export function readableOn(color: string, background = '#EFE9E1', minRatio = 4.5): string {
  let rgb = hexToRgb(color)
  for (let i = 0; i < 40 && contrastRatio(rgbToHex(rgb), background) < minRatio; i++) {
    rgb = rgb.map((v) => v * 0.94) as RGB
  }
  return rgbToHex(rgb)
}

/** Fargen med gjennomsiktighet, f.eks. til svake bakgrunner. */
export function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
