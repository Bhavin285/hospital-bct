import { useState } from 'react'
import UserSidebar from './UserSidebar'
import AnimalForm from './pages/AnimalForm'
import UserRecords from './pages/UserRecords'
import AnimalView from './pages/AnimalView'
import { useAuth } from '../hooks/useAuth'
import './UserPage.css'

function UserPage() {
  const user = useAuth()
  const userName = user?.name || user?.username || 'User'
  const [activePage, setActivePage] = useState('dashboard')
  const [viewAnimalData, setViewAnimalData] = useState(null)

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      sessionStorage.clear()
      window.location.href = '/login'
    }
  }

  const handleViewAnimal = (record) => {
    setViewAnimalData(record)
    setActivePage('view-animal')
  }

  const handleBackFromView = () => {
    setViewAnimalData(null)
    setActivePage('records')
  }

  const renderPage = () => {
    switch (activePage) {
      case 'records': return <UserRecords setActivePage={setActivePage} onViewAnimal={handleViewAnimal} />
      case 'view-animal': return <AnimalView record={viewAnimalData} onBack={handleBackFromView} />
      case 'dashboard': default: return <AnimalForm />
    }
  }

  return (
    <div className="user-page">
      <UserSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={handleLogout}
        userName={userName}
      />
      <main className="user-content">
        <div className="page-container" key={activePage}>
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default UserPage