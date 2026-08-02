import { useFileUpload } from '../../../hooks/useFileUpload'

export default function AudioUploadInput({ apiUrl, value, onChange, label = 'Upload audio file', practiceName, locationName, disabled = false }) {
  const { upload, remove, uploading, error } = useFileUpload(apiUrl)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const uploaded = await upload(file, practiceName, locationName)
      onChange({ fileId: uploaded.fileId, filename: uploaded.filename, driveUrl: uploaded.driveUrl || '' })
    } catch {
      // error already surfaced via the hook's error state
    }
  }

  const handleRemove = () => {
    if (value?.fileId) remove(value.fileId)
    onChange(null)
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="upload-row">
        <label className="btn-drive" style={{ cursor: uploading || disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
          <i className="ti ti-upload"></i> {uploading ? 'Uploading…' : 'Choose audio file'}
          <input type="file" accept="audio/*" onChange={handleFile} disabled={uploading || disabled} style={{ display: 'none' }} />
        </label>
        {value?.fileId ? (
          <>
            <a className="upload-fname" href={`${apiUrl}/uploads/${value.fileId}`} target="_blank" rel="noreferrer">
              {value.filename}
            </a>
            {value.driveUrl && (
              <a className="upload-fname" href={value.driveUrl} target="_blank" rel="noreferrer">
                <i className="ti ti-brand-google-drive"></i> View in Drive
              </a>
            )}
            {!disabled && (
              <button type="button" className="btn-sm danger" onClick={handleRemove}>
                <i className="ti ti-trash"></i>
              </button>
            )}
          </>
        ) : (
          <span className="upload-fname">No file uploaded</span>
        )}
      </div>
      {error && (
        <div className="hint" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
