import type { ScheduleDto } from '../../api/client'
import type { DayOfWeek } from '../../api/client'
import { weekOrder } from '../../lib/scheduleMath'
import { clockLabel, scheduleWindow } from '../../lib/time'

export function DayDots({ days }: { days: readonly DayOfWeek[] }) {
  return (
    <span aria-label={`Works ${weekOrder.filter((day) => days.includes(day)).join(', ')}`} className="day-dots" role="img">
      {weekOrder.map((day) => (
        <span aria-hidden="true" className={days.includes(day) ? 'is-on' : undefined} key={day}>
          {day[0]}
        </span>
      ))}
    </span>
  )
}

export function HoursRuler({
  startMinutes,
  endMinutes,
  breakStart,
  breakEnd,
}: {
  startMinutes: number
  endMinutes: number
  breakStart: number | null
  breakEnd: number | null
}) {
  const from = Math.min(6 * 60, Math.floor(startMinutes / 60) * 60)
  const to = Math.max(22 * 60, Math.ceil(endMinutes / 60) * 60)
  const span = Math.max(to - from, 60)
  const at = (minutes: number) => `${((minutes - from) / span) * 100}%`
  const width = (minutes: number) => `${(minutes / span) * 100}%`
  const ticks: number[] = []
  for (let minutes = from; minutes <= to; minutes += 4 * 60) ticks.push(minutes)
  const valid = endMinutes > startMinutes

  return (
    <div aria-hidden="true" className="ruler">
      <div className="ruler-track">
        {valid && (
          <span className="ruler-window" style={{ left: at(startMinutes), width: width(endMinutes - startMinutes) }} />
        )}
        {valid && breakStart !== null && breakEnd !== null && breakEnd > breakStart && (
          <span className="ruler-break" style={{ left: at(breakStart), width: width(breakEnd - breakStart) }} />
        )}
      </div>
      <div className="ruler-ticks">
        {ticks.map((minutes) => (
          <span className="mono" key={minutes} style={{ left: at(minutes) }}>
            {clockLabel(minutes).slice(0, 2)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ScheduleRuler({ schedule }: { schedule: ScheduleDto }) {
  const { startMinutes, endMinutes } = scheduleWindow(schedule)
  return (
    <HoursRuler
      breakEnd={schedule.breakEndMinute}
      breakStart={schedule.breakStartMinute}
      endMinutes={endMinutes}
      startMinutes={startMinutes}
    />
  )
}
