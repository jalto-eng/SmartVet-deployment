import { useEffect, useRef, useState } from 'react'

export default function TimePicker({ value, onChange, times, bookedTimes, disabled, placeholder }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  return <div ref={root} className="relative mt-1" onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={trigger} type="button" disabled={disabled} aria-expanded={open && !disabled} aria-label={`Preferred time: ${value || placeholder}`} onClick={() => setOpen(v => !v)} className="w-full border border-slate-300 rounded-lg p-3 bg-white text-left flex justify-between items-center disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500">
      <span>{value || placeholder}</span><span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
    </button>
    {open && !disabled && <div role="group" aria-label="Time slots" className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg overflow-y-auto overscroll-contain" style={{maxHeight: 208}}>
      {times.map(time => <button type="button" key={time} disabled={bookedTimes.includes(time)} aria-pressed={value === time} onClick={() => { onChange(time); setOpen(false); trigger.current?.focus() }} className={`block w-full text-left px-3 py-2 text-sm hover:bg-teal-50 disabled:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed ${value === time ? 'bg-teal-100 text-teal-800 font-semibold' : ''}`}>
        {time}{bookedTimes.includes(time) ? ' — Unavailable' : ''}
      </button>)}
    </div>}
  </div>
}
