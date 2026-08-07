import { useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'
import { isMine } from '../../lib/isMine'

function formatTimestamp(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// A Sheets-comment-style discussion thread on one submission — shared by every view that shows
// it (specialist/QA detail views, the POC's own submission view), so there's exactly one place
// that knows how to post/render a comment rather than three separate copies.
export default function CommentThread({ submission, onPosted }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const comments = submission?.comments || []

  const post = async () => {
    const trimmed = text.trim()
    if (!trimmed || posting) return
    setPosting(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to post comment')
      setText('')
      onPosted?.(body)
    } catch (err) {
      showToast(err.message || 'Failed to post comment', 'error')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="review-section comment-thread">
      <div className="review-section-header">
        <h3>Comments</h3>
        <span className="hint" style={{ margin: 0 }}>
          {comments.length} comment{comments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="comment-list">
        {comments.length === 0 ? (
          <div className="hint">No comments yet. Ask a question or leave a note below.</div>
        ) : (
          comments.map((c) => (
            <div className="comment-row" key={c._id}>
              <div className="comment-meta">
                <span className="comment-author">{c.authorName}</span>
                {isMine(c.authorName, user?.name) && <span className="you-badge">you</span>}
                <span className="comment-time">{formatTimestamp(c.createdAt)}</span>
              </div>
              <div className="comment-text">{c.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="comment-add-row">
        <textarea
          className="inline-edit-input comment-input"
          placeholder="Ask a question or leave a note…"
          value={text}
          disabled={posting}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              post()
            }
          }}
        />
        <button type="button" className="btn-sm" disabled={posting || !text.trim()} onClick={post}>
          <i className="ti ti-send"></i> {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
