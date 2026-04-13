import { api } from './client'

export const fetchAnimals = (params = {}) => {
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  const query = new URLSearchParams(filtered).toString()
  return api.get(`/admit_form${query ? `?${query}` : ''}`)
}

export const createAnimal = (data) => api.post('/admit_form', data)

export const updateAnimal = (tagNumber, data) => api.patch(`/admit_form/${tagNumber}`, data)
