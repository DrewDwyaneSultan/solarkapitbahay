/** Maps API / validation errors to plain, actionable messages for operators and households. */

const FIELD_LABELS = {
  name: 'Barangay name',
  contact_email: 'Operator email',
  barangay_name: 'Barangay name',
  head_name: 'Head of household',
  display_name: 'Your name',
  mqtt_broker_host: 'MQTT broker address',
  mqtt_broker_port: 'MQTT port',
  battery_low_threshold_pct: 'Battery low threshold',
  households: 'Number of households',
  battery_capacity_kwh: 'Battery capacity',
  simulation_days: 'Simulation duration',
  min_soc_pct: 'Minimum battery SOC',
  max_soc_pct: 'Maximum battery SOC',
  barangay_code: 'Barangay code',
  household_code: 'Household code',
  address: 'Address',
  purok: 'Purok / zone',
};

function fieldLabel(loc) {
  if (!Array.isArray(loc) || loc.length === 0) return 'This field';
  const key = String(loc[loc.length - 1] ?? '');
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ');
}

function pydanticItemToMessage(item) {
  const label = fieldLabel(item.loc);
  const type = item.type ?? '';
  const msg = String(item.msg ?? '');
  const min = item.ctx?.min_length ?? item.ctx?.ge;
  const max = item.ctx?.max_length ?? item.ctx?.le;

  if (type === 'missing' || (type === 'string_type' && item.input === undefined)) {
    return {
      title: `${label} is required`,
      message: `Please fill in ${label.toLowerCase()} before continuing.`,
      hint: hintForField(item.loc),
    };
  }

  if (type === 'string_too_short' || /at least \d+ character/i.test(msg)) {
    const n = min ?? 2;
    if (String(item.loc?.at(-1)) === 'contact_email') {
      return {
        title: 'Operator email is missing or too short',
        message: 'Enter a complete email address for barangay alerts and contact.',
        hint: 'Example: operator@barangay.gov.ph — use the inbox you check regularly.',
      };
    }
    if (String(item.loc?.at(-1)) === 'name') {
      return {
        title: 'Barangay name is too short',
        message: `Enter at least ${n} characters for your barangay name.`,
        hint: 'Example: Barangay Mabini',
      };
    }
    return {
      title: `${label} is too short`,
      message: `Enter at least ${n} characters.`,
      hint: hintForField(item.loc),
    };
  }

  if (type === 'string_too_long' || /at most \d+ character/i.test(msg)) {
    return {
      title: `${label} is too long`,
      message: `Use at most ${max ?? 120} characters.`,
      hint: 'Shorten the text and try again.',
    };
  }

  if (type === 'value_error' && /email/i.test(msg)) {
    return {
      title: 'Invalid email address',
      message: `${label} must look like name@example.com.`,
      hint: 'Check for typos, a missing @ symbol, or spaces.',
    };
  }

  if (type === 'greater_than_equal' || type === 'less_than_equal' || type === 'int_parsing') {
    return {
      title: `${label} is out of range`,
      message: min != null && max != null
        ? `Use a value between ${min} and ${max}.`
        : `Check the allowed range for ${label.toLowerCase()}.`,
      hint: hintForField(item.loc),
    };
  }

  return {
    title: `Problem with ${label.toLowerCase()}`,
    message: msg.replace(/^Value error,?\s*/i, '') || 'Please check this field and try again.',
    hint: hintForField(item.loc),
  };
}

function hintForField(loc) {
  const key = String(loc?.at(-1) ?? '');
  switch (key) {
    case 'contact_email':
      return 'This email receives registration and alert notifications.';
    case 'mqtt_broker_host':
      return 'Use your laptop IP where Mosquitto runs (same as ESP32 mqttBroker).';
    case 'mqtt_broker_port':
      return 'Default MQTT port is 1883 unless you changed it.';
    case 'battery_low_threshold_pct':
      return 'Typical range is 10–30%. Alerts fire when community battery drops below this.';
    case 'barangay_code':
      return 'Ask your barangay operator for the exact code — spelling and dashes matter.';
    case 'household_code':
      return 'Pick your home from the list or paste the code from your operator.';
    case 'head_name':
      return 'Enter the household head\'s full name (at least 2 characters).';
    default:
      return null;
  }
}

const STATUS_MESSAGES = {
  401: {
    title: 'Session expired',
    message: 'Please sign out and sign in again.',
    hint: 'Your login token may have timed out.',
  },
  403: {
    title: 'Not allowed',
    message: 'You do not have permission for this action.',
    hint: 'Make sure you are signed in as a barangay operator.',
  },
  404: {
    title: 'Not found',
    message: 'The item you requested could not be found.',
    hint: 'It may have been deleted or your barangay is not registered yet.',
  },
  422: {
    title: 'Check your entries',
    message: 'Some fields need to be corrected before we can continue.',
    hint: 'Review the highlighted information and try again.',
  },
  500: {
    title: 'Server error',
    message: 'Something went wrong on our side.',
    hint: 'Wait a moment and try again. If this keeps happening, restart the backend.',
  },
  503: {
    title: 'Service unavailable',
    message: 'The server is waking up or temporarily offline.',
    hint: 'Wait 10–20 seconds and retry.',
  },
};

const KNOWN_API_STRINGS = {
  'No barangay registered yet.': {
    title: 'Barangay not set up',
    message: 'Complete barangay registration before changing settings.',
    hint: 'You should see the onboarding screen on first sign-in as an operator.',
  },
  'You already registered a barangay': {
    title: 'Barangay already registered',
    message: 'This account already has a barangay linked.',
    hint: 'Go to Settings to update your barangay details.',
  },
  'Register your barangay first.': {
    title: 'Register your barangay first',
    message: 'Finish barangay setup before using this feature.',
    hint: 'Sign in as operator and complete the virtual hub registration.',
  },
  'Profile not found': {
    title: 'Profile not found',
    message: 'We could not load your account profile.',
    hint: 'Sign out, sign in again, and complete the profile setup steps.',
  },
};

/** Turn FastAPI `detail` (string or Pydantic array) into a user-facing message string. */
export function friendlyApiDetail(detail) {
  const parsed = friendlyApiDetailObject(detail);
  if (!parsed) return null;
  return parsed.hint ? `${parsed.message} ${parsed.hint}` : parsed.message;
}

/** Rich shape for toast pop-ups. */
export function friendlyApiDetailObject(detail) {
  if (detail == null) return null;

  if (typeof detail === 'string') {
    const known = KNOWN_API_STRINGS[detail];
    if (known) return known;
    return { title: 'Could not complete request', message: detail, hint: null };
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = pydanticItemToMessage(detail[0]);
    if (detail.length > 1) {
      return {
        ...first,
        hint: first.hint
          ? `${first.hint} (${detail.length} fields need attention.)`
          : `${detail.length} fields need attention.`,
      };
    }
    return first;
  }

  return { title: 'Could not complete request', message: String(detail), hint: null };
}

export function friendlyHttpStatus(status) {
  return STATUS_MESSAGES[status] ?? {
    title: 'Request failed',
    message: `Something went wrong (error ${status}).`,
    hint: 'Try again in a moment.',
  };
}

export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return { title: 'Error', message: fallback, hint: null };
  if (typeof err === 'string') {
    const known = KNOWN_API_STRINGS[err];
    return known ?? { title: 'Something went wrong', message: err, hint: null };
  }
  if (err.title && err.message) return err;

  const msg = String(err.message ?? '').trim();
  if (!msg) return { title: 'Error', message: fallback, hint: null };

  const known = KNOWN_API_STRINGS[msg];
  if (known) return known;

  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return {
      title: 'Cannot reach server',
      message: 'The app could not connect to the backend.',
      hint: 'Check your internet, then confirm the API is running (npm run dev:backend locally, or wait for Vercel to wake up).',
    };
  }

  if (/timed out|abort/i.test(msg)) {
    return {
      title: 'Request timed out',
      message: msg,
      hint: 'The server may still be starting — wait a few seconds and try again.',
    };
  }

  if (/simulation failed/i.test(msg)) {
    return {
      title: 'Simulation failed',
      message: 'The greedy simulation could not run.',
      hint: 'Confirm the backend is online and household count is between 5 and 100.',
    };
  }

  return { title: 'Something went wrong', message: msg, hint: null };
}

export function validateSettingsForm({ barangayName, contactEmail, broker, port, battLow }) {
  const name = barangayName?.trim() ?? '';
  if (name.length < 2) {
    return {
      title: 'Barangay name is too short',
      message: 'Enter your full barangay name (at least 2 characters).',
      hint: 'Example: Barangay Mabini',
    };
  }

  const email = contactEmail?.trim() ?? '';
  if (!email) {
    return {
      title: 'Operator email is required',
      message: 'Add the email where you want barangay alerts and contact messages sent.',
      hint: 'Example: operator@barangay.gov.ph',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      title: 'Invalid operator email',
      message: 'Enter a valid email address with an @ symbol and domain.',
      hint: 'Example: operator@barangay.gov.ph',
    };
  }

  const portNum = Number(port);
  if (!broker?.trim()) {
    return {
      title: 'MQTT broker address is required',
      message: 'Enter the IP address of the laptop running the MQTT broker.',
      hint: 'This must match mqttBroker in your ESP32 sketches.',
    };
  }
  if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
    return {
      title: 'Invalid MQTT port',
      message: 'Port must be a number between 1 and 65535.',
      hint: 'Most setups use 1883.',
    };
  }

  const batt = Number(battLow);
  if (!Number.isFinite(batt) || batt < 1 || batt > 100) {
    return {
      title: 'Invalid battery threshold',
      message: 'Battery low threshold must be between 1% and 100%.',
      hint: '20% is a common default for low-battery alerts.',
    };
  }

  return null;
}

export function validateBarangayOnboarding({ name, contactEmail }) {
  const trimmedName = name?.trim() ?? '';
  if (trimmedName.length < 2) {
    return {
      title: 'Barangay name is too short',
      message: 'Enter your barangay name (at least 2 characters).',
      hint: 'Example: Barangay Mabini',
    };
  }

  const email = contactEmail?.trim() ?? '';
  if (!email) {
    return {
      title: 'Contact email is required',
      message: 'Enter the email you use as the barangay operator.',
      hint: 'Households and system alerts will reference this address.',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      title: 'Invalid contact email',
      message: 'Enter a valid email like name@example.com.',
      hint: 'Check for typos or a missing @ symbol.',
    };
  }

  return null;
}

export function validateHouseholdForm({ headName }) {
  const name = headName?.trim() ?? '';
  if (name.length < 2) {
    return {
      title: 'Household name is too short',
      message: 'Enter the head of household name (at least 2 characters).',
      hint: 'Example: Maria Santos',
    };
  }
  return null;
}

export function validateSimulationForm({ households, batteryCapacity, minSoc, maxSoc, duration }) {
  if (households < 5 || households > 100) {
    return {
      title: 'Invalid household count',
      message: 'Simulation supports 5 to 100 households.',
      hint: 'Adjust the Households slider in Community Settings.',
    };
  }
  if (batteryCapacity < 5 || batteryCapacity > 200) {
    return {
      title: 'Invalid battery size',
      message: 'Battery capacity must be between 5 and 200 kWh.',
      hint: 'Adjust the Battery Capacity slider.',
    };
  }
  if (minSoc >= maxSoc) {
    return {
      title: 'SOC range is invalid',
      message: 'Minimum SOC must be lower than maximum SOC.',
      hint: 'Example: Min 20% and Max 95%.',
    };
  }
  const days = Number(duration);
  if (![7, 30, 90].includes(days)) {
    return {
      title: 'Invalid duration',
      message: 'Choose 7, 30, or 90 days for the simulation.',
      hint: 'Use the Duration dropdown in Battery & Tariff Settings.',
    };
  }
  return null;
}
