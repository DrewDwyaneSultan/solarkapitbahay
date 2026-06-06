/** Charge / discharge / balanced — matches backend/clustering.py ACTION_META */

export const BATTERY_ACTIONS = {
  charge: {
    label: 'Charge',
    color: '#2563eb',
    bgClass: 'bg-blue-50 text-blue-900 border-blue-200',
    dotClass: 'bg-blue-600',
    icon: '↓',
    hint: 'Charge battery — drawing from grid or community surplus.',
  },
  discharge: {
    label: 'Discharge',
    color: '#d97706',
    bgClass: 'bg-amber-50 text-amber-900 border-amber-200',
    dotClass: 'bg-amber-500',
    icon: '↑',
    hint: 'Discharge / share — surplus available for neighbors.',
  },
  balanced: {
    label: 'Balanced',
    color: '#6b7280',
    bgClass: 'bg-stone-100 text-stone-800 border-stone-200',
    dotClass: 'bg-stone-500',
    icon: '●',
    hint: 'Hold SOC — near balance between load and solar.',
  },
};

export function actionStyle(action) {
  return BATTERY_ACTIONS[action] ?? BATTERY_ACTIONS.balanced;
}
