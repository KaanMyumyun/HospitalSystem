import { useState } from 'react'
import type { DepartmentDto } from '../api'
import { Modal } from './ui'

export function DepartmentDialog({
  userName,
  departments,
  onChoose,
  onCancel,
}: {
  userName: string
  departments: DepartmentDto[]
  onChoose: (departmentId: number) => void
  onCancel: () => void
}) {
  const active = departments.filter((department) => department.isActive)
  const [departmentId, setDepartmentId] = useState(active[0]?.id)

  return (
    <Modal title="Make a doctor" onClose={onCancel}>
      <p className="dialog-text">{userName} becomes a doctor. Which department will they work in?</p>
      {departmentId === undefined ? (
        <p className="form-error">No department is active. Create or activate one first.</p>
      ) : (
        <div className="form-grid">
          <label>
            Department
            <select value={departmentId} onChange={(event) => setDepartmentId(Number(event.target.value))}>
              {active.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="primary-button"
          disabled={departmentId === undefined}
          type="button"
          onClick={() => departmentId !== undefined && onChoose(departmentId)}
        >
          Make doctor
        </button>
      </div>
    </Modal>
  )
}
