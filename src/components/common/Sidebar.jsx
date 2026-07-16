import { Link, useLocation } from 'react-router-dom'
import logoLight from '../../assets/voicestack-logo.svg'
import logoDark from '../../assets/voicestack-logo-dark.svg'

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="dash-sidebar">
      <div className="brand dash-sidebar-brand">
        <img className="brand-logo-dark" src={logoDark} alt="Voicestack" height="20" />
        <img className="brand-logo-light" src={logoLight} alt="Voicestack" height="20" />
      </div>
      <nav className="dash-nav">
        <Link to="/" className={`dash-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <i className="ti ti-layout-dashboard"></i> Dashboard
        </Link>
        <Link to="/new" className={`dash-nav-item ${location.pathname === '/new' ? 'active' : ''}`}>
          <i className="ti ti-plus"></i> New Submission
        </Link>
      </nav>
    </aside>
  )
}
