/**
 * Varsler når en økt eller pause er over: en rolig lyd og (hvis tillatt) et systemvarsel.
 *
 * Nettlesere tillater bare lyd etter at brukeren har trykket på noe, så lyden
 * "låses opp" når du starter timeren. På iPad virker systemvarsler bare når appen
 * er lagt til på hjemskjermen; lyden og teksten i appen virker uansett.
 */

let audio: AudioContext | null = null

/** Kalles når du trykker Start, så lyden får lov til å spilles senere. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') audio.resume()
  } catch {
    // Nettleseren støtter ikke lyd; appen fungerer likevel.
  }
}

/** To myke toner, som en liten klokke. */
export function chime() {
  if (!audio) return
  const now = audio.currentTime
  ;[
    [659.25, 0], // E5
    [880, 0.22], // A5
  ].forEach(([frequency, delay]) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0, now + delay)
    gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2)
    osc.connect(gain).connect(audio!.destination)
    osc.start(now + delay)
    osc.stop(now + delay + 1.3)
  })
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
}

export function notify(title: string, body: string) {
  chime()
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    new Notification(title, { body, icon: '/favicon.svg' })
  }
}
