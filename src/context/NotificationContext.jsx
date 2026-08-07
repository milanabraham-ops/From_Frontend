import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth, API_URL } from './AuthContext'
import { apiFetch } from '../lib/apiFetch'
import { playNotificationSound } from '../lib/notificationSound'

const NotificationContext = createContext(null)
const CATEGORIES = ['newRequest', 'qaHandoff', 'pocHandover', 'comment']
const POLL_MS = 5000
const EMPTY_IDS = { newRequest: new Set(), qaHandoff: new Set(), pocHandover: new Set(), comment: new Set() }

function storageKey(userId) {
  return `voicestack.notifications.v2.${userId}`
}

function blankState() {
  return {
    baselined: { newRequest: false, qaHandoff: false, pocHandover: false, comment: false },
    seen: { newRequest: {}, qaHandoff: {}, pocHandover: {}, comment: {} },
  }
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return blankState()
    const parsed = JSON.parse(raw)
    const blank = blankState()
    return {
      baselined: { ...blank.baselined, ...parsed.baselined },
      seen: {
        newRequest: { ...blank.seen.newRequest, ...parsed.seen?.newRequest },
        qaHandoff: { ...blank.seen.qaHandoff, ...parsed.seen?.qaHandoff },
        pocHandover: { ...blank.seen.pocHandover, ...parsed.seen?.pocHandover },
        comment: { ...blank.seen.comment, ...parsed.seen?.comment },
      },
    }
  } catch {
    return blankState()
  }
}

function saveState(userId, state) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state))
  } catch {
    // storage full/unavailable — badges just won't persist across reloads, not fatal
  }
}

// Which submissions/groups matter for which category, scoped to the current user. "createdAt" is
// when the location was first submitted; "qaHandoffAt"/"pocHandoverAt" are separate app-stamped
// moments (see Submission.js) for when it actually became QA's problem, and when QA told the POC
// it's done. Comments are per-submission — the latest one addressed to this user (notifyUserId),
// same granularity as the other three categories so every category can share one code path.
function relevantEvents(submissions, groups, role, userId) {
  const events = { newRequest: [], qaHandoff: [], pocHandover: [], comment: [] }
  const wantsNewRequest = ['specialist', 'qa', 'admin'].includes(role)
  const wantsQaHandoff = ['qa', 'admin'].includes(role)
  const wantsPocHandover = ['poc', 'admin'].includes(role)

  for (const s of submissions) {
    if (wantsNewRequest && s.createdAt) events.newRequest.push({ id: s._id, at: s.createdAt })
    if (wantsQaHandoff && s.qaHandoffAt) events.qaHandoff.push({ id: s._id, at: s.qaHandoffAt })
    if (wantsPocHandover && s.pocHandoverAt) events.pocHandover.push({ id: s._id, at: s.pocHandoverAt })

    const mine = (s.comments || []).filter((c) => String(c.notifyUserId) === String(userId))
    if (mine.length) {
      const latest = mine.reduce((max, c) => (!max || new Date(c.createdAt) > new Date(max) ? c.createdAt : max), null)
      events.comment.push({ id: s._id, at: latest })
    }
  }

  // GET /submissions deliberately excludes grouped locations (group: null filter) for a POC —
  // those are only reachable via /groups, which rolls each group's most recent handover into
  // mostRecentHandoverAt so a multi-location account's POC still gets notified. (Comments on
  // grouped locations aren't covered yet — /groups doesn't expose them.)
  if (wantsPocHandover) {
    for (const g of groups) {
      if (g.mostRecentHandoverAt) events.pocHandover.push({ id: g._id, at: g.mostRecentHandoverAt })
    }
  }

  return events
}

// Global, cross-page: new-request/handoff/handover/comment badges + a sound, driven by a
// background poll independent of whatever page is currently open. Read state is tracked
// per-item (per submission/group), not one "seen up to X" timestamp per category — so a nav
// badge reflects "something in here is unseen" while each list page can point at exactly which
// row it is, and opening the list itself doesn't blow away that detail.
export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [badges, setBadges] = useState({ newRequest: false, qaHandoff: false, pocHandover: false, comment: false })
  const [unseenIds, setUnseenIds] = useState(EMPTY_IDS)
  const stateRef = useRef(blankState())
  const alertedRef = useRef(new Set())

  useEffect(() => {
    stateRef.current = user ? loadState(user.id) : blankState()
    alertedRef.current = new Set()
    setBadges({ newRequest: false, qaHandoff: false, pocHandover: false, comment: false })
    setUnseenIds(EMPTY_IDS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function poll() {
      try {
        const wantsPocHandover = ['poc', 'admin'].includes(user.role)
        const [subsRes, groupsRes] = await Promise.all([
          apiFetch(`${API_URL}/submissions`),
          wantsPocHandover ? apiFetch(`${API_URL}/groups`) : Promise.resolve(null),
        ])
        if (!subsRes.ok || cancelled) return
        const submissions = await subsRes.json().then((b) => (Array.isArray(b) ? b : []))
        const groups = wantsPocHandover && groupsRes?.ok ? await groupsRes.json().then((b) => (Array.isArray(b) ? b : [])) : []
        const events = relevantEvents(submissions, groups, user.role, user.id)

        const state = stateRef.current
        // Each category baselines itself independently, once — the first time it's ever polled,
        // whatever already exists is "already seen", so shipping this doesn't retroactively
        // alert on old history. Anything that shows up after that is real.
        for (const cat of CATEGORIES) {
          if (!state.baselined[cat]) {
            state.baselined[cat] = true
            for (const e of events[cat]) {
              if (state.seen[cat][e.id] === undefined) state.seen[cat][e.id] = e.at
            }
          }
        }
        saveState(user.id, state)

        const nextBadges = {}
        const nextIds = {}
        let playSound = false
        for (const cat of CATEGORIES) {
          const seenMap = state.seen[cat]
          const unseen = events[cat].filter((e) => new Date(e.at) > new Date(seenMap[e.id] || 0))
          nextBadges[cat] = unseen.length > 0
          nextIds[cat] = new Set(unseen.map((e) => e.id))
          const unalerted = unseen.filter((e) => !alertedRef.current.has(`${cat}:${e.id}:${e.at}`))
          if (unalerted.length > 0) {
            unalerted.forEach((e) => alertedRef.current.add(`${cat}:${e.id}:${e.at}`))
            playSound = true
          }
        }
        if (!cancelled) {
          setBadges(nextBadges)
          setUnseenIds(nextIds)
          if (playSound) playNotificationSound()
        }
      } catch {
        // A missed poll just means the badge waits for the next one — not worth surfacing.
      }
    }

    poll()
    const interval = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user])

  // Clears the unread flag for one specific item in one category — called when that row is
  // actually opened/acted on, not just when the list page it lives on is visited, so the dot
  // stays put (letting someone "pinpoint which one") until it's genuinely addressed.
  const markSeen = useCallback(
    (category, itemId) => {
      if (!user || !itemId) return
      const state = stateRef.current
      state.seen[category] = { ...state.seen[category], [String(itemId)]: new Date().toISOString() }
      saveState(user.id, state)
      setUnseenIds((prev) => {
        const next = new Set(prev[category])
        next.delete(String(itemId))
        setBadges((prevBadges) => ({ ...prevBadges, [category]: next.size > 0 }))
        return { ...prev, [category]: next }
      })
    },
    [user],
  )

  return <NotificationContext.Provider value={{ badges, unseenIds, markSeen }}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
