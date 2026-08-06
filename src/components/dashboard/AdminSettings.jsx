import { useEffect, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import '../form/form.css'

const BLANK = {
  gchatQaWebhookUrl: '',
  gchatPocWebhookUrl: '',
}

export default function AdminSettings() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await apiFetch(`${API_URL}/admin/settings`)
        if (!res.ok) throw new Error('Failed to load settings')
        const body = await res.json()
        if (!cancelled) setForm((f) => ({ ...f, ...body }))
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
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save settings')
      setForm((f) => ({ ...f, ...body }))
      showToast('Settings saved.')
    } catch (err) {
      const message = err.message || 'Failed to save settings'
      setError(message)
      showToast(message, 'error')
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
              <p>Google Chat notifications. Changes apply immediately, no restart needed.</p>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          <form onSubmit={save}>
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
