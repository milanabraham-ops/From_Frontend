import { useEffect, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import StatTile from '../charts/StatTile'
import TimeRangeFilter from '../charts/TimeRangeFilter'
import BarChart from '../charts/BarChart'
import PieChart from '../charts/PieChart'
import RadarChart from '../charts/RadarChart'
import { categoricalColor } from '../charts/chartTheme'
import '../form/form.css'
import '../charts/charts.css'

function statusCount(statusBreakdown, label) {
  return (statusBreakdown || []).find((s) => s.status === label)?.count || 0
}

// Market is nominal (no order), unlike Configuration Status — a plain categorical breakdown.
function marketSegments(marketBreakdown, theme) {
  return (marketBreakdown || []).map((m, i) => ({ label: m.market, value: m.count, color: categoricalColor(theme, i) }))
}

export default function StatsOverview() {
  const { token, user } = useAuth()
  const { theme } = useTheme()
  const [range, setRange] = useState('month')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await apiFetch(`${API_URL}/stats?range=${range}`)
        if (!res.ok) throw new Error('Failed to load stats')
        const body = await res.json()
        if (!cancelled) setData(body)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load stats')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, range])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />
      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Dashboard</h1>
              <p>Stats for {user?.name}.</p>
            </div>
            <TimeRangeFilter value={range} onChange={setRange} />
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
            </div>
          )}

          {loading || !data ? (
            <div className="dash-empty">Loading…</div>
          ) : data.role === 'poc' ? (
            <PocStats data={data} theme={theme} />
          ) : data.role === 'specialist' ? (
            <PersonStats data={data} mineKey="configured" mineWord="configured" />
          ) : data.role === 'qa' ? (
            <PersonStats data={data} mineKey="reviewed" mineWord="reviewed" />
          ) : (
            <AdminStats data={data} theme={theme} />
          )}
        </CustomScrollbar>
      </main>
    </div>
  )
}

function PocStats({ data, theme }) {
  const { mine, othersLeaderboard } = data
  return (
    <>
      <div className="dash-stats-row">
        <StatTile icon="ti-map-pin" tone="accent" label="Locations submitted" value={mine.total} />
        <StatTile icon="ti-building" tone="brand" label="Accounts" value={mine.accounts} />
        <StatTile icon="ti-circle-check" tone="success" label="Completed" value={mine.completed} />
        <StatTile icon="ti-loader-2" tone="warning" label="In progress" value={statusCount(mine.status, 'In Progress')} />
        <StatTile icon="ti-checklist" tone="brand" label="In QA" value={statusCount(mine.status, 'QA')} />
        <StatTile
          icon="ti-percentage"
          tone="brand"
          label="Completion rate"
          value={mine.total ? Math.round((mine.completed / mine.total) * 100) : 0}
          suffix="%"
        />
        <StatTile
          icon="ti-clock"
          tone="warning"
          label="Avg days to configure"
          value={mine.avgDaysToConfigure ?? '—'}
          suffix={mine.avgDaysToConfigure != null ? ' d' : ''}
        />
      </div>

      <div className="chart-grid-row">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Submitted over time</h3>
            {mine.trend.truncated && <span className="chart-sub">showing recent activity</span>}
          </div>
          <BarChart data={mine.trend.points.map((p) => ({ label: p.label, value: p.count }))} orientation="vertical" />
        </div>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Market mix</h3>
          </div>
          <PieChart segments={marketSegments(mine.market, theme)} />
        </div>
      </div>

      <div className="chart-grid-row">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Locations submitted per POC</h3>
            {othersLeaderboard.omitted > 0 && <span className="chart-sub">+{othersLeaderboard.omitted} more not shown</span>}
          </div>
          <BarChart data={othersLeaderboard.rows.map((r) => ({ label: r.name, value: r.count }))} orientation="horizontal" />
        </div>
      </div>
    </>
  )
}

function PersonStats({ data, mineKey, mineWord }) {
  const { mine, team, radar } = data
  return (
    <>
      <div className="chart-card-header" style={{ marginBottom: 4 }}>
        <h3>Your stats</h3>
      </div>
      <div className="dash-stats-row">
        <StatTile icon="ti-hand-stop" tone="accent" label={`You ${mineWord}`} value={mine[mineKey]} />
        <StatTile icon="ti-building" tone="brand" label="Your accounts" value={mine.accounts} />
        <StatTile icon="ti-circle-check" tone="success" label="You completed" value={mine.completed} />
        {mine.avgDaysToConfigure !== undefined && (
          <StatTile
            icon="ti-clock"
            tone="warning"
            label="Your avg days"
            value={mine.avgDaysToConfigure ?? '—'}
            suffix={mine.avgDaysToConfigure != null ? ' d' : ''}
          />
        )}
      </div>

      <div className="chart-card-header" style={{ marginBottom: 4, marginTop: '1.5rem' }}>
        <h3>Team stats</h3>
      </div>
      <div className="dash-stats-row">
        <StatTile icon="ti-users" tone="brand" label={`Team ${mineWord}`} value={team[mineKey]} />
        <StatTile icon="ti-building" tone="brand" label="Team accounts" value={team.accounts} />
        <StatTile icon="ti-circle-check" tone="success" label="Team completed" value={team.completed} />
        <StatTile
          icon="ti-user-check"
          tone="accent"
          label="Active team members"
          value={team.activeSpecialists ?? team.activeReviewers}
        />
        <StatTile
          icon="ti-chart-bar"
          tone="warning"
          label={`Avg ${mineWord} per person`}
          value={team.avgConfiguredPerPerson ?? team.avgReviewedPerPerson}
        />
      </div>

      {radar.axes.length >= 3 ? (
        <div className="chart-grid-row">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>You vs team average</h3>
            </div>
            <RadarChart axes={radar.axes} series={radar.series} colors={['var(--accent)', 'var(--text3)']} />
          </div>
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Your activity over time</h3>
            </div>
            <BarChart data={mine.trend.points.map((p) => ({ label: p.label, value: p.count }))} orientation="vertical" />
          </div>
        </div>
      ) : (
        // Only 2 comparable axes here (no reliable speed metric for QA) — a radar needs 3+ points
        // to read as a shape, so skip it; the tiles above already carry the you-vs-team numbers.
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Your activity over time</h3>
          </div>
          <BarChart data={mine.trend.points.map((p) => ({ label: p.label, value: p.count }))} orientation="vertical" />
        </div>
      )}

      <div className="chart-grid-row">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Team comparison: {mineWord} per teammate</h3>
            {team.leaderboard.omitted > 0 && <span className="chart-sub">+{team.leaderboard.omitted} more not shown</span>}
          </div>
          <BarChart data={team.leaderboard.rows.map((r) => ({ label: r.name, value: r.count }))} orientation="horizontal" />
        </div>
      </div>
    </>
  )
}

function AdminStats({ data, theme }) {
  const { overview, trend, market, specialistLeaderboard, qaLeaderboard, pocLeaderboard, radarTopSpecialists } = data
  return (
    <>
      <div className="dash-stats-row">
        <StatTile icon="ti-map-pin" tone="accent" label="Locations" value={overview.total} />
        <StatTile icon="ti-building" tone="brand" label="Accounts" value={overview.accounts} />
        <StatTile icon="ti-circle-check" tone="success" label="Completed" value={overview.completed} />
        <StatTile icon="ti-loader-2" tone="warning" label="In progress" value={overview.inProgress} />
        <StatTile icon="ti-checklist" tone="brand" label="In QA" value={overview.inQA} />
        <StatTile
          icon="ti-clock"
          tone="accent"
          label="Avg days to configure"
          value={overview.avgDaysToConfigure ?? '—'}
          suffix={overview.avgDaysToConfigure != null ? ' d' : ''}
        />
      </div>

      <div className="chart-grid-row">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Submitted over time</h3>
            {trend.truncated && <span className="chart-sub">showing recent activity</span>}
          </div>
          <BarChart data={trend.points.map((p) => ({ label: p.label, value: p.count }))} orientation="vertical" />
        </div>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Market mix</h3>
          </div>
          <PieChart segments={marketSegments(market, theme)} />
        </div>
      </div>

      <div className="chart-grid-row">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Accounts configured per specialist</h3>
            {specialistLeaderboard.omitted > 0 && <span className="chart-sub">+{specialistLeaderboard.omitted} more not shown</span>}
          </div>
          <BarChart
            data={specialistLeaderboard.rows.map((r) => ({ label: r.name, value: r.count }))}
            orientation="horizontal"
          />
        </div>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Accounts reviewed per QA</h3>
            {qaLeaderboard.omitted > 0 && <span className="chart-sub">+{qaLeaderboard.omitted} more not shown</span>}
          </div>
          <BarChart data={qaLeaderboard.rows.map((r) => ({ label: r.name, value: r.count }))} orientation="horizontal" />
        </div>
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Implementation requests per POC</h3>
            {pocLeaderboard.omitted > 0 && <span className="chart-sub">+{pocLeaderboard.omitted} more not shown</span>}
          </div>
          <BarChart data={pocLeaderboard.rows.map((r) => ({ label: r.name, value: r.count }))} orientation="horizontal" />
        </div>
      </div>

      {radarTopSpecialists.series.length > 0 && (
        <div className="chart-grid-row">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Top specialists: volume, speed, completion rate</h3>
            </div>
            <RadarChart
              axes={radarTopSpecialists.axes}
              series={radarTopSpecialists.series}
              colors={radarTopSpecialists.series.map((_, i) => categoricalColor(theme, i))}
            />
          </div>
        </div>
      )}
    </>
  )
}
