import { useEffect, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import '../form/form.css'

const BLANK = {
  smtpHost: '',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPass: '',
  emailFrom: '',
  gchatQaWebhookUrl: '',
  gchatPocWebhookUrl: '',
}

export default function AdminSettings() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const [form, setForm] = useState(BLANK)
  const [smtpPassSet, setSmtpPassSet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Failed to load settings')
        const body = await res.json()
        if (!cancelled) {
          setForm((f) => ({ ...f, ...body, smtpPass: '' }))
          setSmtpPassSet(body.smtpPassSet)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      // Only send smtpPass if the admin actually typed a new one — blank means "leave as is".
      const { smtpPass, ...rest } = form
      const payload = smtpPass ? { ...rest, smtpPass } : rest
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save settings')
      setForm((f) => ({ ...f, ...body, smtpPass: '' }))
      setSmtpPassSet(body.smtpPassSet)
      setSaved(true)
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <div className="dash-empty">Loading…</div>
        </main>
      </div>
    )
  }

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Notification Settings</h1>
              <p>Email and Google Chat notifications. Changes apply immediately, no restart needed.</p>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}
          {saved && (
            <div className="info-box">
              <i className="ti ti-circle-check"></i>
              Settings saved.
            </div>
          )}

          <form onSubmit={save}>
            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Email (SMTP)</h2>
                <p>Sent to every specialist/qa user when a new implementation request comes in.</p>
              </div>
              <div className="add-user-fields settings-field-row">
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="SMTP host (e.g. smtp.gmail.com)"
                  value={form.smtpHost}
                  onChange={(e) => update('smtpHost', e.target.value)}
                />
                <input
                  type="number"
                  className="inline-edit-input settings-port-input"
                  placeholder="Port"
                  value={form.smtpPort}
                  onChange={(e) => update('smtpPort', e.target.value)}
                />
                <label className="show-own-toggle">
                  <input type="checkbox" checked={form.smtpSecure} onChange={(e) => update('smtpSecure', e.target.checked)} />
                  Use SSL
                </label>
              </div>
              <div className="add-user-fields settings-field-row">
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="SMTP username"
                  value={form.smtpUser}
                  onChange={(e) => update('smtpUser', e.target.value)}
                />
                <input
                  type="password"
                  className="inline-edit-input"
                  placeholder={smtpPassSet ? 'Password set, leave blank to keep it' : 'SMTP password'}
                  value={form.smtpPass}
                  onChange={(e) => update('smtpPass', e.target.value)}
                />
                <input
                  type="email"
                  className="inline-edit-input"
                  placeholder="From address (defaults to username)"
                  value={form.emailFrom}
                  onChange={(e) => update('emailFrom', e.target.value)}
                />
              </div>
            </div>

            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Google Chat</h2>
                <p>
                  Incoming webhook URLs. In the target space: space name (top-left) → Apps &amp; integrations → Webhooks → Add
                  webhook.
                </p>
              </div>
              <div className="field tight">
                <label>QA team space (posted when a specialist hands a location to QA)</label>
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="https://chat.googleapis.com/v1/spaces/..."
                  value={form.gchatQaWebhookUrl}
                  onChange={(e) => update('gchatQaWebhookUrl', e.target.value)}
                />
              </div>
              <div className="field">
                <label>POC space (posted when QA marks a location Completed)</label>
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="https://chat.googleapis.com/v1/spaces/..."
                  value={form.gchatPocWebhookUrl}
                  onChange={(e) => update('gchatPocWebhookUrl', e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        </CustomScrollbar>
      </main>
    </div>
  )
}
