import { PMS_OPTIONS } from '../../../data/options'
import ComboBoxInput from '../ui/ComboBoxInput'

export default function Step8LinksPms({ data, update }) {
  const isCsVoicestack = data.environment === 'CS Voicestack'

  return (
    <div className="section visible">
      <div className="section-title">Links, Attachments & PMS</div>
      <div className="section-sub">Share required documents and configure the PMS integration.</div>

      <div className="field">
        <label>
          Phone Information Sheet Link <span className="req">*</span>
        </label>
        <input
          type="url"
          value={data.phoneSheetLink}
          placeholder="https://…"
          onChange={(e) => update('phoneSheetLink', e.target.value)}
        />
      </div>
      <div className="field">
        <label>
          Questionnaire Link <span className="req">*</span>
        </label>
        <input
          type="url"
          value={data.questionnaireLink}
          placeholder="https://…"
          onChange={(e) => update('questionnaireLink', e.target.value)}
        />
      </div>
      <div className="field">
        <label>Additional Notes</label>
        <textarea
          value={data.additionalNotes}
          placeholder="Any other information the implementation team should know…"
          onChange={(e) => update('additionalNotes', e.target.value)}
        />
      </div>

      <div className="divider"></div>
      <div className="subsection-title">PMS Integration</div>
      <div className="field">
        <label>PMS System</label>
        <ComboBoxInput
          value={data.pms}
          onChange={(value) => update('pms', value)}
          options={PMS_OPTIONS}
          placeholder="e.g. CareStack"
          disabled={isCsVoicestack}
        />
        {isCsVoicestack && <div className="hint">CS Voicestack accounts are always connected to CareStack.</div>}
      </div>
      <div className="field">
        <label>Server Access Details</label>
        <textarea
          value={data.serverAccess}
          placeholder="Provide server credentials or access information for the PMS integration…"
          onChange={(e) => update('serverAccess', e.target.value)}
        />
      </div>
    </div>
  )
}
