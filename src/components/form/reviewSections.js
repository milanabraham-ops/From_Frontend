import { QUEUE_TYPES } from '../../data/options'

const QUEUE_KEY_BY_VALUE = Object.fromEntries(QUEUE_TYPES.map((q) => [q.value, q.key]))

function list(value) {
  return Array.isArray(value) && value.length ? value.join(', ') : ''
}

function audioToggleSummary(type, script, file) {
  if (!type) return ''
  if (type !== 'Custom') return 'Default'
  const parts = []
  if (script) parts.push('Script/link provided')
  if (file?.filename) parts.push(`File: ${file.filename}`)
  return parts.length ? parts.join(' · ') : 'Custom selected, but no script/link/file added yet'
}

function rawAudioSummary(script, file) {
  const parts = []
  if (script) parts.push('Script/link provided')
  if (file?.filename) parts.push(`File: ${file.filename}`)
  return parts.length ? parts.join(' · ') : ''
}

function activeQueueDetail(data) {
  const key = QUEUE_KEY_BY_VALUE[data.queueType]
  return key ? data.queue[key] : null
}

export const REVIEW_SECTIONS = [
  {
    title: 'Account & Location',
    step: 0,
    fields: [
      { label: 'Client / Account Name', get: (d) => d.clientName },
      { label: 'Location Name', get: (d) => d.locationName },
      { label: 'Billable Location?', get: (d) => d.locationBillable },
      { label: 'Market', get: (d) => d.market },
      { label: 'Environment', get: (d) => d.environment },
      { label: 'Billing Plan', get: (d) => d.billingPlan },
      { label: 'Implementation POC', get: (d) => d.poc },
      { label: 'Timezone', get: (d) => d.timezone },
      { label: 'Desired Go-Live Date', get: (d) => d.goLiveDate },
    ],
  },
  {
    title: 'Phone Numbers & Hours',
    step: 1,
    fields: [
      { label: 'Phone Numbers', get: (d) => d.phoneNumbers },
      { label: 'Business Days', get: (d) => list(d.businessDays) },
      { label: 'Business Hours', get: (d) => d.businessHours },
      { label: 'After-Hours Days', get: (d) => list(d.afterHoursDays) },
      { label: 'After-Hours Timing', get: (d) => d.afterHoursTiming },
      { label: 'Custom Holidays', get: (d) => d.customHolidays },
    ],
  },
  {
    title: 'Phone Tree & Call Flow',
    step: 2,
    fields: [
      { label: 'Business Hours Phone Tree', get: (d) => d.phoneTree },
      { label: 'Call Flow Detail', get: (d) => d.callFlow },
      { label: 'After-Hours Condition', get: (d) => d.afterHoursCondition },
    ],
  },
  {
    title: 'Audio & Voicemail Scripts',
    step: 3,
    fields: [
      { label: 'Audio Language', get: (d) => d.audioLanguage },
      { label: 'Welcome Audio', get: (d) => audioToggleSummary(d.welcomeType, d.welcomeScript, d.welcomeFile) },
      { label: 'After-Hours Voicemail Audio', get: (d) => audioToggleSummary(d.ahvmType, d.ahvmScript, d.ahvmFile) },
      { label: 'Busy Hours Voicemail Audio', get: (d) => audioToggleSummary(d.bhvmType, d.bhvmScript, d.bhvmFile) },
    ],
  },
  {
    title: 'Ring Groups & Call Queues',
    step: 4,
    fields: [
      { label: 'Ring Type', get: (d) => d.ringType },
      { label: 'Ring Duration (s)', get: (d) => d.ringDuration },
      { label: 'Ring Group Users', get: (d) => d.ringGroupUsers },
      { label: 'Shared Voicemail Group Users', get: (d) => d.svmUsers },
      { label: 'Voicemail to Email Notification', get: (d) => d.vmEmail },
      { label: 'Voicemail Email Addresses', get: (d) => d.vmEmailAddresses },
      { label: 'Call Queue Type', get: (d) => d.queueType },
      {
        label: 'On-Hold Audio',
        get: (d) => {
          const q = activeQueueDetail(d)
          return q ? audioToggleSummary(q.onholdType, q.onholdScript, q.onholdFile) : ''
        },
      },
      { label: 'Max Queue Duration (s)', get: (d) => activeQueueDetail(d)?.maxDuration || '' },
      { label: 'Max Callers in Queue', get: (d) => activeQueueDetail(d)?.maxCallers || '' },
      { label: 'Queue Announcement', get: (d) => list(activeQueueDetail(d)?.announcement) },
      { label: 'Queue Exit Type', get: (d) => activeQueueDetail(d)?.exitType || '' },
      { label: 'Key to Activate Exit', get: (d) => activeQueueDetail(d)?.exitKey || '' },
      {
        label: 'Exit Voicemail / Call-Back Audio',
        get: (d) => {
          const q = activeQueueDetail(d)
          return q ? rawAudioSummary(q.exitScript, q.exitFile) : ''
        },
      },
      { label: 'Auto Dial (Queue Only)', get: (d) => d.autoDial },
    ],
  },
  {
    title: 'Devices, Agents & Access',
    step: 5,
    fields: [
      { label: 'Device Line Keys', get: (d) => d.lineKeys },
      { label: 'Hot Desking Users', get: (d) => d.hotDesking },
      { label: 'Admin Users', get: (d) => d.adminUsers },
      { label: 'AI Usage Limit', get: (d) => d.aiLimit },
      { label: 'Card Assignment Rules', get: (d) => d.cardAssignment },
      { label: 'Card Visibility — Agent Names', get: (d) => d.cardVisibility },
    ],
  },
  {
    title: 'Workflows, DNI & SMS/Fax',
    step: 6,
    fields: [
      { label: 'Automated Workflow', get: (d) => d.workflow },
      { label: 'Workflow Condition', get: (d) => d.workflowCondition },
      { label: 'Workflow Actions', get: (d) => list(d.workflowAction) },
      { label: 'SMS Content per Workflow', get: (d) => d.smsContent },
      { label: 'DNI Campaigns', get: (d) => d.dni },
      { label: 'Campaign Details & Google Ads Credentials', get: (d) => d.dniCampaigns },
      { label: 'SMS Numbers', get: (d) => d.smsNumbers },
      { label: 'Users with SMS Access', get: (d) => d.smsUsers },
      { label: 'Text Unification', get: (d) => d.textUnification },
      { label: 'Fax Numbers', get: (d) => d.faxNumbers },
      { label: 'Users with Fax Access', get: (d) => d.faxUsers },
    ],
  },
  {
    title: 'Links, Attachments & PMS',
    step: 7,
    fields: [
      { label: 'Phone Information Sheet Link', get: (d) => d.phoneSheetLink },
      { label: 'Questionnaire Link', get: (d) => d.questionnaireLink },
      { label: 'Additional Notes', get: (d) => d.additionalNotes },
      { label: 'PMS System', get: (d) => d.pms },
      { label: 'Server Access Details', get: (d) => d.serverAccess },
    ],
  },
]
