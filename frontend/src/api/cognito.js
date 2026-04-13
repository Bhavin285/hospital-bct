import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
})

function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function cognitoLogin(username, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool })
    user.setAuthenticationFlowType('USER_PASSWORD_AUTH')
    const authDetails = new AuthenticationDetails({ Username: username, Password: password })

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken()
        const accessToken = session.getAccessToken().getJwtToken()
        const claims = decodeToken(idToken)

        const userInfo = {
          username: claims['cognito:username'] || username,
          role: claims['custom:role'] || 'staff',
          sub: claims['sub'],
        }

        localStorage.setItem('authToken', idToken)
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('user', JSON.stringify(userInfo))
        resolve(userInfo)
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () => reject(new Error('NEW_PASSWORD_REQUIRED')),
    })
  })
}

export function cognitoLogout() {
  const user = userPool.getCurrentUser()
  if (user) user.signOut()
  localStorage.removeItem('authToken')
  localStorage.removeItem('accessToken')
  localStorage.removeItem('user')
  localStorage.removeItem('rememberedMobile')
}

export function getIdToken() {
  return localStorage.getItem('authToken')
}

export function getAccessToken() {
  return localStorage.getItem('accessToken')
}

export function isTokenExpired() {
  const token = getIdToken()
  if (!token) return true
  const claims = decodeToken(token)
  if (!claims || !claims.exp) return true
  // Add 30s buffer so we don't use a token that's about to expire
  return Date.now() >= (claims.exp - 30) * 1000
}

export function cognitoChangePassword(oldPassword, newPassword) {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser()
    if (!user) return reject(new Error('Not authenticated'))

    user.getSession((err) => {
      if (err) return reject(err)
      user.changePassword(oldPassword, newPassword, (changeErr, result) => {
        if (changeErr) return reject(changeErr)
        resolve(result)
      })
    })
  })
}
