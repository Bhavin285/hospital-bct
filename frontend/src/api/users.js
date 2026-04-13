import { api } from './client'
import { getAccessToken } from './cognito'

export const fetchUsers = () => api.get('/user')
export const createUser = (data) => api.post('/user', data)
export const updateUser = (data) => api.patch('/user', data)
export const deleteUser = (username) => api.delete(`/user?username=${username}`)

// Admin changing another user's password (no old password needed)
export const adminChangePassword = (targetUsername, newPassword) =>
  api.post('/change_password', { target_username: targetUsername, new_password: newPassword })

// User changing own password — sends AccessToken so backend can call cognito.change_password
export const changePassword = ({ old_password, new_password }) =>
  api.post('/change_password', {
    access_token: getAccessToken(),
    old_password,
    new_password,
  })
