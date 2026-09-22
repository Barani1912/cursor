import { useEffect, useRef, useState, type CSSProperties } from 'react'

export const DIRECTIONS = [
  'up-left',
  'up',
  'up-right',
  'left',
  'center',
  'right',
  'down-left',
  'down',
  'down-right',
] as const

export type Direction = (typeof DIRECTIONS)[number]

export const REACTIONS = [
  'blink',
  'heart',
  'sparkle',
  'surprised',
  'wink',
  'bashful',
  'sleepy',
  'dizzy',
  'delighted',
] as const

export type Reaction = (typeof REACTIONS)[number]

const CLOCKWISE: Direction[] = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
]

// All 8 special expressions (excluding blink which is the squash transition blink)
export const PAYOFFS: Reaction[] = [
  'heart',
  'sparkle',
  'surprised',
  'wink',
  'bashful',
  'sleepy',
  'delighted',
  'dizzy',
]

const SECTOR = (Math.PI * 2) / CLOCKWISE.length
const HYSTERESIS = 0.12
const BOOP_BLINK = 120
const BOOP_END = 800
const SQUASH_MS = 420
const DIZZY_WINDOW = 1400
const DIZZY_AFTER = 4
const DIZZY_END = 1200

const SQUASH: Keyframe[] = [
  { transform: 'scale(1, 1)', easing: 'ease-in' },
  { transform: 'scale(1.12, 0.86)', offset: 0.18, easing: 'ease-out' },
  { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
  { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
]

const DIZZY_WOBBLE: Keyframe[] = [
  { transform: 'scale(1, 1) rotate(0deg)' },
  { transform: 'scale(1.08, 0.92) rotate(-8deg)', offset: 0.2 },
  { transform: 'scale(0.94, 1.06) rotate(8deg)', offset: 0.4 },
  { transform: 'scale(1.05, 0.96) rotate(-5deg)', offset: 0.6 },
  { transform: 'scale(0.98, 1.02) rotate(4deg)', offset: 0.8 },
  { transform: 'scale(1, 1) rotate(0deg)' },
]

// background-size 300% makes each cell a clean 0/50/100% step on both axes
function cell(index: number): CSSProperties {
  return {
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  }
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

const layer: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundSize: '300% 300%',
  backgroundRepeat: 'no-repeat',
}

export interface MascotProps {
  directions: string
  reactions: string
  size?: number
  className?: string
  label?: string
}

export function Mascot({
  directions,
  reactions,
  size = 140,
  className,
  label = 'mascot',
}: MascotProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const squashRef = useRef<HTMLSpanElement>(null)
  const timersRef = useRef<number[]>([])
  const sectorRef = useRef<number>(-1)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const touchResetTimerRef = useRef<number | null>(null)

  // Track reaction cycle persistently so every click cycles to the next reaction
  const reactionIndexRef = useRef<number>(0)
  // Track rapid boops separately for dizzy trigger
  const rapidBoopsRef = useRef<{ count: number; at: number }>({ count: 0, at: 0 })

  const [direction, setDirection] = useState<Direction>('center')
  const [reaction, setReaction] = useState<Reaction | null>(null)

  const aim = (pointer: { x: number; y: number } | null) => {
    const button = buttonRef.current
    if (!button || !pointer) {
      return
    }
    const box = button.getBoundingClientRect()
    const dx = pointer.x - (box.left + box.width / 2)
    const dy = pointer.y - (box.top + box.height / 2)
    const deadZone = Math.max(40, size * 0.25)

    if (Math.hypot(dx, dy) < deadZone) {
      sectorRef.current = -1
      setDirection('center')
      return
    }

    const angle = Math.atan2(dy, dx)
    const currentSector = sectorRef.current
    if (
      currentSector !== -1 &&
      Math.abs(wrap(angle - currentSector * SECTOR)) < SECTOR / 2 + HYSTERESIS
    ) {
      return
    }

    const nextSector =
      (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length
    sectorRef.current = nextSector
    setDirection(CLOCKWISE[nextSector])
  }

  // Pointer and Touch movement tracking (works on desktop, mobile view, and real mobile devices)
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      if (touchResetTimerRef.current) {
        window.clearTimeout(touchResetTimerRef.current)
        touchResetTimerRef.current = null
      }
      aim(pointerRef.current)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (touchResetTimerRef.current) {
        window.clearTimeout(touchResetTimerRef.current)
        touchResetTimerRef.current = null
      }
      if (event.touches.length > 0) {
        const touch = event.touches[0]
        pointerRef.current = { x: touch.clientX, y: touch.clientY }
        aim(pointerRef.current)
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (touchResetTimerRef.current) {
        window.clearTimeout(touchResetTimerRef.current)
        touchResetTimerRef.current = null
      }
      if (event.touches.length > 0) {
        const touch = event.touches[0]
        pointerRef.current = { x: touch.clientX, y: touch.clientY }
        aim(pointerRef.current)
      }
    }

    const onTouchEnd = () => {
      // When touch finishes on mobile, return to center after a short delay
      if (touchResetTimerRef.current) {
        window.clearTimeout(touchResetTimerRef.current)
      }
      touchResetTimerRef.current = window.setTimeout(() => {
        sectorRef.current = -1
        setDirection('center')
        pointerRef.current = null
      }, 1200)
    }

    const onMouseLeave = () => {
      sectorRef.current = -1
      setDirection('center')
      pointerRef.current = null
    }

    const onScroll = () => {
      aim(pointerRef.current)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      document.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('scroll', onScroll)
      if (touchResetTimerRef.current) {
        window.clearTimeout(touchResetTimerRef.current)
      }
    }
  }, [size])

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout)
    }
  }, [])

  const boop = () => {
    timersRef.current.forEach(window.clearTimeout)
    timersRef.current = []

    const later = (ms: number, next: Reaction | null) => {
      timersRef.current.push(window.setTimeout(() => setReaction(next), ms))
    }

    const now = Date.now()
    const rapid = rapidBoopsRef.current
    rapid.count = now - rapid.at < DIZZY_WINDOW ? rapid.count + 1 : 1
    rapid.at = now

    // Check if rapid tapping triggered dizzy state
    if (rapid.count >= DIZZY_AFTER) {
      rapid.count = 0
      setReaction('dizzy')
      later(DIZZY_END, null)

      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        squashRef.current?.animate(DIZZY_WOBBLE, { duration: SQUASH_MS * 1.5, easing: 'ease-out' })
      }
      return
    }

    // Normal click: cycle through ALL 8 expressions sequentially
    const payoff = PAYOFFS[reactionIndexRef.current % PAYOFFS.length]
    reactionIndexRef.current += 1

    setReaction('blink')
    later(BOOP_BLINK, payoff)
    later(BOOP_END, null)

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      squashRef.current?.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' })
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={boop}
      aria-label={`Boop the ${label}`}
      className={className}
      style={{
        position: 'relative',
        display: 'block',
        flexShrink: 0,
        width: size,
        height: size,
        padding: 0,
        border: 0,
        background: 'transparent',
        appearance: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        ref={squashRef}
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          height: '100%',
          transformOrigin: '50% 78%',
        }}
      >
        <span
          style={{
            ...layer,
            backgroundImage: `url(${directions})`,
            ...cell(DIRECTIONS.indexOf(direction)),
            opacity: reaction ? 0 : 1,
            transition: 'opacity 0.05s ease',
          }}
        />
        <span
          style={{
            ...layer,
            backgroundImage: `url(${reactions})`,
            ...cell(REACTIONS.indexOf(reaction ?? 'blink')),
            opacity: reaction ? 1 : 0,
            transition: 'opacity 0.05s ease',
          }}
        />
      </span>
    </button>
  )
}
