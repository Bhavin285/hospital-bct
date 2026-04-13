// AdminPage.jsx
import { useState } from 'react'
import Sidebar from './Sidebar'
import AnimalRecords from './pages/AnimalRecords'
import CreateUser from './pages/CreateUser'
import AnimalForm from './pages/AnimalForm'
import AnimalView from './pages/AnimalView'
import ChangePassword from './pages/ChangePassword'
import { useAuth } from '../hooks/useAuth'
import './AdminPage.css'

function AdminPage() {
  const user = useAuth()
  const adminName = user?.name || user?.username || user?.email || 'Admin'
  const [activePage, setActivePage] = useState('form')
  const [editAnimalData, setEditAnimalData] = useState(null)
  const [viewAnimalData, setViewAnimalData] = useState(null)

  const handleSetActivePage = (page) => {
    setActivePage(page)
  }

  const handleEditAnimal = (record) => {
    setEditAnimalData(record)
    setActivePage('edit-animal')
  }

  const handleBackFromEdit = () => {
    setEditAnimalData(null)
    setActivePage('dashboard')
  }

  const handleViewAnimal = (record) => {
    setViewAnimalData(record)
    setActivePage('view-animal')
  }

  const handleBackFromView = () => {
    setViewAnimalData(null)
    setActivePage('dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('auth')
    sessionStorage.clear()
    window.location.href = '/login'
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <AnimalRecords setActivePage={setActivePage} onEditAnimal={handleEditAnimal} onViewAnimal={handleViewAnimal} />
      case 'edit-animal':
        return <AnimalForm editData={editAnimalData} onBack={handleBackFromEdit} />
      case 'view-animal':
        return <AnimalView record={viewAnimalData} onBack={handleBackFromView} />
      case 'create-user':
        return <CreateUser />
      case 'change-password':
        return <ChangePassword />
      case 'form':
      default:
        return <AnimalForm />
    }
  }

  return (
    <div className="admin-page">
      <Sidebar
        activePage={activePage}
        setActivePage={handleSetActivePage}
        onLogout={handleLogout}
        adminName={adminName}
      />
      <main className="admin-content">
        <div className="page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default AdminPage
