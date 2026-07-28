import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logoLight from '../../assets/voicestack-logo.svg'
import logoDark from '../../assets/voicestack-logo-dark.svg'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'ti-layout-dashboard', roles: ['poc', 'admin'] },
  { to: '/new', label: 'New Submission', icon: 'ti-plus', roles: ['poc', 'admin'] },
  { to: '/specialist', label: 'Specialist Queue', icon: 'ti-tools', roles: ['specialist', 'admin'] },
  { to: '/qa', label: 'QA Queue', icon: 'ti-checklist', roles: ['qa', 'admin'] },
  { to: '/admin', label: 'Manage Access', icon: 'ti-users', roles: ['admin'] },
]

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role))

  return (
    <aside className="dash-sidebar">
      <div className="brand dash-sidebar-brand">
        <img className="brand-logo-dark" src={logoDark} alt="Voicestack" height="20" />
        <img className="brand-logo-light" src={logoLight} alt="Voicestack" height="20" />
      </div>
      <nav className="dash-nav">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={`dash-nav-item ${location.pathname === item.to ? 'active' : ''}`}>
            <i className={`ti ${item.icon}`}></i> {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
