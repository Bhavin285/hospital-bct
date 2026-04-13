import { Navigate } from 'react-router-dom'
import { isTokenExpired, cognitoLogout } from '../api/cognito'

function ProtectedRoute({ children, requiredRole }) {
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    // corrupted localStorage
  }

  if (!user || isTokenExpired()) {
    cognitoLogout()
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute
