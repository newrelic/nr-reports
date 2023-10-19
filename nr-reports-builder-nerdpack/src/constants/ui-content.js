export const UI_CONTENT = {
  GLOBAL: {
    HEADER_TITLE: 'New Relic Reports Builder',
    ACTION_LABEL_CANCEL: 'Cancel',
    ACTION_LABEL_DELETE: 'Delete',
    ACTION_LABEL_EDIT: 'Edit',
    ACTION_LABEL_OK: 'OK',
    ACTION_LABEL_REMOVE: 'Remove',
    ACTION_LABEL_SAVE: 'Save',
    ACTION_LABEL_SAVE_AND_CLOSE: 'Save & Close',
    ACTION_LABEL_CLOSE: 'Close',
    ACTION_LABEL_RETRY: 'Retry',
    BUTTON_LABEL_DELETE_REPORT: 'Delete report',
    BUSY: {
      HEADING: 'Working on it, hang tight!',
      DESCRIPTION: 'Be right back.',
    },
    EMPTY_STATE: {
      HEADING: 'No reports found.',
      DESCRIPTION: 'Create a new report',
    },
    NO_REPORT_SELECTED: {
      HEADING: 'No report selected.',
      DESCRIPTION: 'Please select a report.',
    },
  },

  ERRORS: {
    READ_FAILED: {
      HEADING: 'Uh-oh! Something is not right.',
      DESCRIPTION: 'I couldn\'t read the application data.',
    },
    UNKNOWN_ROUTE: {
      HEADING: 'Uh-oh! Something is not right.',
      DESCRIPTION: 'I couldn\'t find what you were looking for.',
    },
  },

  HOME: {
    HEADING: 'Reports',
    BUTTON_LABEL_CREATE_REPORT: 'Create new report',
  },

  CHANNEL_MODAL: {
    CHANNEL_TYPE_LABEL_EMAIL: 'Email',
    CHANNEL_TYPE_LABEL_SLACK: 'Slack',
    HEADING: 'Edit channel',
    FIELD_LABEL_CHANNEL_TYPE: 'Type',
  },
  CHANNELS_FORM: {
    BUTTON_LABEL_ADD_CHANNEL: 'Add channel',
    FIELD_LABEL_CHANNELS_CUSTOM: 'Channels',
    NO_CHANNELS_MESSAGE: 'No channels are defined.',
  },
  DASHBOARDS_FORM: {
    BUTTON_LABEL_SELECT_DASHBOARDS: 'Select dashboards',
    FIELD_LABEL_DASHBOARDS_CUSTOM: 'Dashboards',
    NO_DASHBOARDS_MESSAGE: 'No dashboards are selected.',
  },
  DASHBOARD_PICKER: {
    HEADING: 'Select dashboards',
  },
  EDIT_REPORT_FORM: {
    FIELD_LABEL_NAME: 'Name',
    FIELD_LABEL_TYPE: 'Type',
    FIELD_LABEL_SCHEDULE: 'Schedule',
    HEADING: 'Edit report',
    REPORT_NAME_FIELD_PLACEHOLDER: 'Weekly Performance Dashboards Report',
    SCHEDULE_FIELD_PLACEHOLDER: '* * * * *',
    REPORT_TYPE_LABEL_DASHBOARD: 'Dashboard',
    REPORT_TYPE_LABEL_QUERY: 'Query',
    FORM_ERROR_TITLE: 'Uh-oh! Something is not right.',
    FORM_ERROR_DESCRIPTION: msg => `The unexpected can be frightening: ${msg}`,
    SAVE_ERROR_TITLE: 'Save failed',
    SAVE_ERROR_DESCRIPTION: msg => `Your data could not be saved: ${msg}`,
    SAVE_SUCCESS_TITLE: 'Report saved',
    SAVE_SUCCESS_DESCRIPTION: name => `The report "${name}" was saved.`
  },
  EDIT_REPORT_SCREEN: {
    CANCEL_PROMPT: 'You have made changes to this report. Are you sure you want to cancel?',
  },
  EMAIL_CHANNEL_FORM: {
    CC_FIELD_PLACEHOLDER: `robin@newrelic.com\npat@newrelic.com`,
    FIELD_LABEL_CC: 'Cc',
    FIELD_LABEL_SUBJECT: 'Subject',
    FIELD_LABEL_TEMPLATE: 'Message template',
    FIELD_LABEL_TO: 'To',
    SUBJECT_FIELD_PLACEHOLDER: 'This week\'s performance report',
    TEMPLATE_FIELD_PLACEHOLDER: `Please find attached the performance dashboards for report {{name}}.`,
    TO_FIELD_PLACEHOLDER: `jan@newrelic.com\nsam@newrelic.com`,
  },
  NRQL_EDITOR: {
    QUERY_FIELD_PLACEHOLDER: 'SELECT count(*) FROM Transaction FACET appName',
  },
  QUERY_FORM: {
    FIELD_LABEL_ACCOUNTS: 'Accounts',
    ACCOUNTS_FIELD_PLACEHOLDER: 'Select accounts...',
    FIELD_LABEL_QUERY: 'Query',
    QUERY_FIELD_PLACEHOLDER: 'SELECT count(*) FROM Transaction FACET appName',
  },
  REPORT_LIST: {
    HEADING: 'Reports',
  },
  SLACK_CHANNEL_FORM: {
    CC_FIELD_PLACEHOLDER: `robin@newrelic.com\npat@newrelic.com`,
    FIELD_LABEL_WEBHOOK_URL: 'Webhook URL',
    WEBHOOK_URL_FIELD_PLACEHOLDER: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
  },
}
