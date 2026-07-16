import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function useFileUpload(apiUrl) {
  const { token } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file, practiceName, locationName) => {
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (practiceName) formData.append('practiceName', practiceName)
      if (locationName) formData.append('locationName', locationName)
      const res = await fetch(`${apiUrl}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Upload failed')
      }
      return await res.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setUploading(false)
    }
  }

  const remove = async (fileId) => {
    try {
      await fetch(`${apiUrl}/uploads/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // best-effort cleanup, ignore failures
    }
  }

  return { upload, remove, uploading, error }
}
