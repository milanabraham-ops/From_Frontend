import CheckboxGroup from './CheckboxGroup'
import AudioSourceInput from './AudioSourceInput'
import { QUEUE_ANNOUNCEMENTS, QUEUE_EXIT_TYPES } from '../../../data/options'

export default function QueueDetails({ detail, apiUrl, practiceName, locationName, updateDetail }) {
  return (
    <>
      <div className="g2">
        <div className="field">
          <label>Max Queue Duration (s)</label>
          <input
            type="number"
            value={detail.maxDuration}
            placeholder="e.g. 300"
            onChange={(e) => updateDetail('maxDuration', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Max Callers in Queue</label>
          <input
            type="number"
            value={detail.maxCallers}
            placeholder="e.g. 10"
            onChange={(e) => updateDetail('maxCallers', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Queue Announcement</label>
        <CheckboxGroup
          options={QUEUE_ANNOUNCEMENTS}
          value={detail.announcement}
          onChange={(v) => updateDetail('announcement', v)}
        />
      </div>
      <div className="g2">
        <div className="field">
          <label>Queue Exit Type</label>
          <select value={detail.exitType} onChange={(e) => updateDetail('exitType', e.target.value)}>
            <option value="">Select…</option>
            {QUEUE_EXIT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Key to Activate Exit</label>
          <input
            type="text"
            value={detail.exitKey}
            placeholder="e.g. 1"
            onChange={(e) => updateDetail('exitKey', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Exit Voicemail / Call-Back Audio</label>
      </div>
      <AudioSourceInput
        script={detail.exitScript}
        onScriptChange={(v) => updateDetail('exitScript', v)}
        file={detail.exitFile}
        onFileChange={(v) => updateDetail('exitFile', v)}
        apiUrl={apiUrl}
        practiceName={practiceName}
        locationName={locationName}
        scriptPlaceholder="Script, filename, or audio link if audio already exists…"
      />
    </>
  )
}
