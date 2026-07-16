import RadioGroup from '../ui/RadioGroup'
import QueueOnHold from '../ui/QueueOnHold'
import QueueDetails from '../ui/QueueDetails'
import { RING_TYPES, QUEUE_TYPES } from '../../../data/options'

export default function Step5RingQueue({ data, update, apiUrl, practiceName, locationName }) {
  const activeQueueKey = QUEUE_TYPES.find((q) => q.value === data.queueType)?.key

  const updateQueueDetail = (key) => (field, value) => {
    update('queue', {
      ...data.queue,
      [key]: { ...data.queue[key], [field]: value },
    })
  }

  return (
    <div className="section visible">
      <div className="section-title">Ring Groups & Call Queues</div>
      <div className="section-sub">Configure how agents receive calls and how callers wait in queue.</div>

      <div className="subsection-title">Ring Group</div>
      <div className="g2">
        <div className="field">
          <label>
            Ring Type <span className="req">*</span>
          </label>
          <RadioGroup name="ringtype" options={RING_TYPES} value={data.ringType} onChange={(v) => update('ringType', v)} />
        </div>
        <div>
          <div className="field">
            <label>
              Ring Duration (seconds) <span className="req">*</span>
            </label>
            <input
              type="number"
              value={data.ringDuration}
              placeholder="e.g. 30"
              onChange={(e) => update('ringDuration', e.target.value)}
            />
          </div>
          <div className="field">
            <label>
              Users / Extensions in Ring Group <span className="req">*</span>
            </label>
            <textarea
              style={{ minHeight: 75 }}
              value={data.ringGroupUsers}
              placeholder="e.g. John - ext 101, Mary - ext 102"
              onChange={(e) => update('ringGroupUsers', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="divider"></div>
      <div className="subsection-title">Shared Voicemail Group</div>
      <div className="field">
        <label>
          Users / Extensions in SVM Group <span className="req">*</span>
        </label>
        <textarea
          value={data.svmUsers}
          placeholder="e.g. John - ext 101, Mary - ext 102, Reception - ext 100"
          onChange={(e) => update('svmUsers', e.target.value)}
        />
      </div>
      <div className="field">
        <label>
          Voicemail to Email Notification <span className="req">*</span>
        </label>
        <RadioGroup name="vmEmail" options={['Yes', 'No']} value={data.vmEmail} onChange={(v) => update('vmEmail', v)} row />
      </div>
      {data.vmEmail === 'Yes' && (
        <div className="cond show">
          <div className="field">
            <label>Email addresses for voicemail notifications</label>
            <textarea
              value={data.vmEmailAddresses}
              placeholder={'e.g. reception@clinic.com, manager@clinic.com\nEnter one email per line or comma-separated.'}
              onChange={(e) => update('vmEmailAddresses', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="divider"></div>
      <div className="subsection-title">Call Queue</div>
      <div className="field">
        <label>
          Call Queue Type <span className="req">*</span>
        </label>
        <RadioGroup name="qtype" options={QUEUE_TYPES} value={data.queueType} onChange={(v) => update('queueType', v)} />
      </div>

      {activeQueueKey === 'exit' && (
        <div className="cond show">
          <QueueOnHold
            prefix="exit"
            detail={data.queue.exit}
            apiUrl={apiUrl}
            practiceName={practiceName}
            locationName={locationName}
            updateDetail={updateQueueDetail('exit')}
          />
        </div>
      )}

      {activeQueueKey === 'dq' && (
        <div className="cond show">
          <QueueOnHold
            prefix="dq"
            detail={data.queue.dq}
            apiUrl={apiUrl}
            practiceName={practiceName}
            locationName={locationName}
            updateDetail={updateQueueDetail('dq')}
          />
          <QueueDetails
            detail={data.queue.dq}
            apiUrl={apiUrl}
            practiceName={practiceName}
            locationName={locationName}
            updateDetail={updateQueueDetail('dq')}
          />
        </div>
      )}

      {activeQueueKey === 'qo' && (
        <div className="cond show">
          <QueueOnHold
            prefix="qo"
            detail={data.queue.qo}
            apiUrl={apiUrl}
            practiceName={practiceName}
            locationName={locationName}
            updateDetail={updateQueueDetail('qo')}
          />
          <QueueDetails
            detail={data.queue.qo}
            apiUrl={apiUrl}
            practiceName={practiceName}
            locationName={locationName}
            updateDetail={updateQueueDetail('qo')}
          />
          <div className="field">
            <label>
              Auto-Dial <span className="req">*</span>
            </label>
            <RadioGroup name="autoDial" options={['Yes', 'No']} value={data.autoDial} onChange={(v) => update('autoDial', v)} row />
          </div>
        </div>
      )}
    </div>
  )
}
