import { apiFetch } from './client'

export async function fetchEmployees() {
  const data = await apiFetch('/api/admin/employees')
  return data.employees
}

export async function fetchEmployeeDetail(id) {
  return apiFetch(`/api/admin/employees/${encodeURIComponent(id)}`)
}
