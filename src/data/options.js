export const STEP_LABELS = [
  'Account',
  'Phone',
  'Call flow',
  'Audio',
  'Ring/Queue',
  'Devices',
  'Workflows',
  'Files & PMS',
  'Review',
]

export const TOTAL_STEPS = STEP_LABELS.length

export const TIMEZONES = [
  'Eastern Time (ET) — UTC-5/4',
  'Central Time (CT) — UTC-6/5',
  'Mountain Time (MT) — UTC-7/6',
  'Mountain Standard Time (MST, no DST) — UTC-7',
  'Pacific Time (PT) — UTC-8/7',
  'Alaska Time (AKT) — UTC-9/8',
  'Hawaii-Aleutian Time (HAT) — UTC-10/9',
  'Hawaii Standard Time (HST, no DST) — UTC-10',
  'Samoa Standard Time — UTC-11',
  'Chamorro Standard Time — UTC+10',
  'Atlantic Time (AT) — UTC-4/3',
  'Puerto Rico — UTC-4',
]

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
export const ALL_DAYS = [...WEEKDAYS, 'Saturday', 'Sunday']

export const MARKETS = ['Dental', 'Ophthalmology', 'Physiotherapy', 'Veterinary']

export const PHONE_TREE_OPTIONS = [
  'Gather Extension',
  'Dial',
  'Contact Type',
  'Gather Digits (IVR)',
  'Voicemail',
]

export const RING_TYPES = ['Simultaneous', 'Round Robin', 'Priority', 'Longest Waiting Time']

export const QUEUE_TYPES = [
  { key: 'exit', label: 'Dial & exit', value: 'Dial & Exit' },
  { key: 'dq', label: 'Dial & queue', value: 'Dial & Queue' },
  { key: 'qo', label: 'Queue only', value: 'Queue only' },
]

export const QUEUE_ANNOUNCEMENTS = ['Position', 'Wait time']
export const QUEUE_EXIT_TYPES = ['Voicemail', 'Call back']

export const WORKFLOW_ACTIONS = [
  'Send text message',
  'Create to-do',
  'Trigger voicemail playback',
  'NIL',
]

export const CARD_ASSIGNMENT_OPTIONS = ['Answered Agent', 'Round Robin']

const emptyQueueDetail = () => ({
  onholdType: '',
  onholdScript: '',
  onholdFile: null,
  maxDuration: '',
  maxCallers: '',
  announcement: [],
  exitType: '',
  exitKey: '',
  exitScript: '',
  exitFile: null,
})

export const initialFormData = {
  // Step 1
  clientName: '',
  locationName: '',
  locationBillable: '',
  market: '',
  environment: 'Voicestack',
  billingPlan: '',
  poc: '',
  timezone: '',
  goLiveDate: '',
  // Step 2
  phoneNumbers: '',
  businessDays: [],
  businessHours: '',
  afterHoursDays: [],
  afterHoursTiming: '',
  customHolidays: '',
  // Step 3
  phoneTree: '',
  callFlow: '',
  afterHoursCondition: '',
  // Step 4
  audioLanguage: '',
  welcomeType: '',
  welcomeScript: '',
  welcomeFile: null,
  ahvmType: '',
  ahvmScript: '',
  ahvmFile: null,
  bhvmType: '',
  bhvmScript: '',
  bhvmFile: null,
  // Step 5
  ringType: '',
  ringDuration: '',
  ringGroupUsers: '',
  svmUsers: '',
  vmEmail: '',
  vmEmailAddresses: '',
  queueType: '',
  queue: {
    exit: emptyQueueDetail(),
    dq: emptyQueueDetail(),
    qo: emptyQueueDetail(),
  },
  autoDial: '',
  // Step 6
  lineKeys: '',
  hotDesking: '',
  adminUsers: '',
  aiLimit: '',
  cardAssignment: '',
  cardVisibility: '',
  // Step 7
  workflow: '',
  workflowCondition: '',
  workflowAction: [],
  smsContent: '',
  dni: '',
  dniCampaigns: '',
  smsNumbers: '',
  smsUsers: '',
  textUnification: '',
  faxNumbers: '',
  faxUsers: '',
  // Step 8
  phoneSheetLink: '',
  questionnaireLink: '',
  additionalNotes: '',
  pms: '',
  serverAccess: '',
}
