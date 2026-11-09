import { useState } from 'react'
import { loadPatient, loadPatients, pageSize, updatePatient } from '../../api/client'
import type { PatientAppointmentDto, PatientDetailsDto } from '../../api/client'
import { useMediaQuery, useNow } from '../../app/hooks'
import { usePagedSearch, useResource } from '../../app/useResource'
import { useWorkspace } from '../../app/workspaceContext'
import { clinicDate } from '../../lib/clinicTime'
import { ageOn, dateOnlyLabel, longDate, mediumDate, relativeDay, timeOf } from '../../lib/dates'
import { personName } from '../../lib/names'
import { cleanPhone } from '../../lib/validation'
import type { ScreenProps } from '../../shell/Shell'
import { Button } from '../../ui/Button'
import { Empty, LoadError, Pager, Skeleton, Status } from '../../ui/bits'
import { Field, FormError } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { PageHead, SearchField } from '../../ui/Page'
import './patients.css'
import { formatPhone } from '../../lib/phone'

export function Patients({ params }: ScreenProps) {
  const { go } = useWorkspace()
  const now = useNow(60_000)
  const split = useMediaQuery('(min-width: 1100px)')
  const selectedId = Number(params.get('patient')) || null
  const list = usePagedSearch('patients', (search, page, signal) => loadPatients(search, page, signal))
  const record = useResource(selectedId ? `patient:${selectedId}` : null, (signal) => loadPatient(selectedId ?? 0, signal))
  const today = clinicDate(now)
  const items = list.data?.items ?? []

  const showList = split || selectedId === null
  const showRecord = split || selectedId !== null

  return (
    <div className={`patients${split ? ' is-split' : ''}`}>
      {showList && (
        <section aria-label="Patient list" className="patients-list">
          <PageHead lede="Search by name, or by at least three digits of a phone number." title="Patients" />
          <div className="patients-search">
            <SearchField label="Search patients" placeholder="Name or phone" value={list.query} onChange={list.setQuery} />
          </div>
          <div className={`patients-results${list.stale || list.searching ? ' is-stale' : ''}`}>
            {list.error && !list.data ? (
              <LoadError message={list.error} onRetry={() => void list.reload()} />
            ) : !list.data ? (
              <Skeleton className="patients-skeleton" lines={8} />
            ) : items.length === 0 ? (
              <Empty size="sm" title={list.term ? 'No one matches that' : 'No patients yet'}>
                {list.term ? 'Check the spelling, or try part of the phone number.' : 'Patients appear here after their first booking.'}
              </Empty>
            ) : (
              <ul className="patient-rows">
                {items.map((patient) => (
                  <li key={patient.patientId}>
                    <button
                      aria-current={patient.patientId === selectedId ? 'true' : undefined}
                      className="patient-row"
                      type="button"
                      onClick={() => go('patients', { patient: patient.patientId })}
                    >
                      <span className="patient-row-name">{patient.name}</span>
                      <span className="patient-row-meta">
                        {dateOnlyLabel(patient.dateOfBirth)} · {ageOn(patient.dateOfBirth, today)} yrs
                      </span>
                      <span className="patient-row-phone mono">{formatPhone(patient.phoneNumber)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.data && (
              <Pager
                hasNextPage={list.data.hasNextPage}
                loading={list.loading || list.stale || list.searching}
                noun="patients"
                page={list.page}
                pageSize={pageSize}
                shown={items.length}
                onPage={list.setPage}
              />
            )}
          </div>
        </section>
      )}

      {showRecord && (
        <section aria-label="Patient record" className="patients-record">
          {selectedId === null ? (
            <Empty size="lg" title="Choose a patient">
              Their details, upcoming bookings and visit history show up here.
            </Empty>
          ) : record.error && !record.data ? (
            <LoadError message={record.error} onRetry={() => void record.reload()} />
          ) : !record.data ? (
            <div className="record">
              <Skeleton lines={10} />
            </div>
          ) : (
            <PatientRecord
              key={record.data.patientId}
              now={now}
              patient={record.data}
              onBack={split ? undefined : () => go('patients')}
            />
          )}
        </section>
      )}
    </div>
  )
}

function PatientRecord({ patient, now, onBack }: { patient: PatientDetailsDto; now: number; onBack?: () => void }) {
  const { readOnly, go } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const today = clinicDate(now)
  const byTime = (left: PatientAppointmentDto, right: PatientAppointmentDto) =>
    new Date(left.appointmentTime).getTime() - new Date(right.appointmentTime).getTime()
  const upcoming = patient.appointments
    .filter((item) => item.status === 'Scheduled' && new Date(item.appointmentTime).getTime() > now)
    .sort(byTime)
  const history = patient.appointments.filter((item) => !upcoming.includes(item)).sort((left, right) => byTime(right, left))
  const completed = patient.appointments.filter((item) => item.status === 'Completed').length
  const noShows = patient.appointments.filter((item) => item.status === 'NoShow').length
  const cancelled = patient.appointments.filter((item) => item.status === 'Cancelled').length

  return (
    <article className="record">
      {onBack && (
        <button className="record-back link-btn" type="button" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          All patients
        </button>
      )}

      {editing ? (
        <PatientForm patient={patient} onDone={() => setEditing(false)} />
      ) : (
        <header className="record-head">
          <div>
            <p className="page-kicker">Patient #{patient.patientId}</p>
            <h2 className="record-name">{patient.name}</h2>
            <p className="record-meta">
              <span>
                Born {dateOnlyLabel(patient.dateOfBirth, 'long')} · {ageOn(patient.dateOfBirth, today)} years
              </span>
              <span className="mono">{formatPhone(patient.phoneNumber)}</span>
            </p>
          </div>
          <Button icon="edit" locked={readOnly} onClick={() => setEditing(true)}>
            Edit details
          </Button>
        </header>
      )}

      <dl className="record-stats">
        <div>
          <dt>Visits</dt>
          <dd>{completed}</dd>
        </div>
        <div>
          <dt>Upcoming</dt>
          <dd>{upcoming.length}</dd>
        </div>
        <div className={noShows > 0 ? 'is-warn' : undefined}>
          <dt>No-shows</dt>
          <dd>{noShows}</dd>
        </div>
        <div>
          <dt>Cancelled</dt>
          <dd>{cancelled}</dd>
        </div>
      </dl>

      <section className="record-section">
        <h3 className="section-title">
          Upcoming <span className="count">{upcoming.length || 'None'}</span>
        </h3>
        {upcoming.length === 0 ? (
          <p className="record-none">Nothing booked ahead.</p>
        ) : (
          <ul className="upcoming">
            {upcoming.map((item) => {
              const time = new Date(item.appointmentTime)
              const relative = relativeDay(time, now)
              return (
                <li key={item.appointmentId}>
                  <div className="upcoming-when">
                    <span className="upcoming-date">{relative ?? mediumDate(time)}</span>
                    <span className="mono">{timeOf(time)}</span>
                  </div>
                  <div className="upcoming-what">
                    <span>{personName(item.doctorName)}</span>
                    <span className="upcoming-sub">{longDate(time)}</span>
                  </div>
                  <Button
                    iconAfter="arrow-right"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      go('reception', { doctor: item.doctorId, at: item.appointmentTime, appointment: item.appointmentId })
                    }
                  >
                    Open in reception
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="record-section">
        <h3 className="section-title">
          History <span className="count">{history.length || 'None'}</span>
        </h3>
        {history.length === 0 ? (
          <p className="record-none">No earlier visits.</p>
        ) : (
          <div className="table-wrap">
            <table className="table history-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Doctor</th>
                  <th scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const time = new Date(item.appointmentTime)
                  return (
                    <tr key={item.appointmentId}>
                      <td className="nowrap">{mediumDate(time)}</td>
                      <td className="mono">{timeOf(time)}</td>
                      <td>{personName(item.doctorName)}</td>
                      <td>
                        <Status status={item.status} unmarked={time.getTime() <= now} />
                        {item.cancellationReason && <span className="cell-note">{item.cancellationReason}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  )
}

function PatientForm({ patient, onDone }: { patient: PatientDetailsDto; onDone: () => void }) {
  const { run, busy, readOnly } = useWorkspace()
  const now = useNow(60_000)
  const [name, setName] = useState(patient.name)
  const [phone, setPhone] = useState(patient.phoneNumber)
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth)
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changed = name !== patient.name || phone !== patient.phoneNumber || dateOfBirth !== patient.dateOfBirth
  const digits = phone.replace(/\D/g, '').length
  const today = clinicDate(now)

  const problems = {
    name: !name.trim() ? 'Enter a name' : null,
    phone: !phone.trim() ? 'Enter a phone number' : digits < 7 || digits > 15 ? 'Use 7 to 15 digits' : null,
    dateOfBirth: !dateOfBirth ? 'Enter the date of birth' : dateOfBirth > today ? 'That date is in the future' : null,
  }

  const submit = async () => {
    setTried(true)
    if (problems.name || problems.phone || problems.dateOfBirth) return
    if (!changed) {
      onDone()
      return
    }
    const outcome = await run(
      () => updatePatient(patient.patientId, { name: name.trim(), phoneNumber: phone.trim(), dateOfBirth }),
      'Patient details saved',
      { quiet: true },
    )
    if (outcome.ok) onDone()
    else if (outcome.error) setError(outcome.error)
  }

  return (
    <form
      className="record-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="page-kicker">Editing patient #{patient.patientId}</p>
      <Field error={tried ? problems.name : null} label="Name">
        {(control) => (
          <input
            {...control}
            className="input"
            maxLength={50}
            value={name}
            onChange={(event) => {
              setError(null)
              setName(event.target.value)
            }}
          />
        )}
      </Field>
      <div className="form-grid-2">
        <Field error={tried ? problems.phone : null} label="Phone">
          {(control) => (
            <input
              {...control}
              className="input mono-input"
              inputMode="tel"
              maxLength={20}
              value={phone}
              onChange={(event) => {
                setError(null)
                setPhone(cleanPhone(event.target.value))
              }}
            />
          )}
        </Field>
        <Field error={tried ? problems.dateOfBirth : null} label="Date of birth">
          {(control) => (
            <input
              {...control}
              className="input"
              max={today}
              min="1900-01-01"
              type="date"
              value={dateOfBirth}
              onChange={(event) => {
                setError(null)
                setDateOfBirth(event.target.value)
              }}
            />
          )}
        </Field>
      </div>
      <p className="field-hint">Changes are recorded in the audit log. Upcoming bookings keep pointing at this patient.</p>
      {error && <FormError>{error}</FormError>}
      <div className="btn-row">
        <Button busy={busy} locked={readOnly} type="submit" variant="primary">
          Save changes
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
