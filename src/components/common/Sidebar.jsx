import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import logoLight from '../../assets/voicestack-logo.svg'
import logoDark from '../../assets/voicestack-logo-dark.svg'

// badge = red dot (new request/handoff/handover); commentBadge = green dot (unread comment) —
// a nav item can show either, both, or neither at once, since they mean different things.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'ti-chart-bar', roles: ['poc', 'specialist', 'qa', 'admin'] },
  {
    to: '/',
    label: 'Accounts',
    icon: 'ti-layout-dashboard',
    roles: ['poc', 'admin'],
    badge: (b) => b.pocHandover,
    commentBadge: (b) => b.comment,
  },
  { to: '/new', label: 'New Submission', icon: 'ti-plus', roles: ['poc', 'admin'] },
  {
    to: '/specialist',
    label: 'Configuration Requests',
    icon: 'ti-tools',
    roles: ['specialist', 'qa', 'admin'],
    badge: (b) => b.newRequest,
    commentBadge: (b) => b.comment,
  },
  {
    // Comments are between the POC and whoever configures the account — that conversation lives
    // on Configuration Requests regardless of whether the person on the other end is a
    // specialist, qa, or admin, so QA Requests only ever gets the handoff badge, not comments.
    to: '/qa',
    label: 'QA Requests',
    icon: 'ti-checklist',
    roles: ['qa', 'admin'],
    badge: (b) => b.qaHandoff,
  },
  { to: '/admin', label: 'Manage Access', icon: 'ti-users', roles: ['admin'] },
  { to: '/admin/settings', label: 'Settings', icon: 'ti-settings', roles: ['admin'] },
]

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const { badges } = useNotifications()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(user?.role))

  return (
    <aside className="dash-sidebar">
      <div className="brand dash-sidebar-brand">
        <img className="brand-logo-dark" src={logoDark} alt="Voicestack" height="26" />
        <img className="brand-logo-light" src={logoLight} alt="Voicestack" height="26" />
      </div>
      <nav className="dash-nav">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={`dash-nav-item ${location.pathname === item.to ? 'active' : ''}`}>
            <i className={`ti ${item.icon}`}></i> {item.label}
            {(item.badge?.(badges) || item.commentBadge?.(badges)) && (
              <span className="dash-nav-badges">
                {item.badge?.(badges) && <span className="dash-nav-badge" aria-label="New activity" />}
                {item.commentBadge?.(badges) && <span className="dash-nav-badge comment" aria-label="New comment" />}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
