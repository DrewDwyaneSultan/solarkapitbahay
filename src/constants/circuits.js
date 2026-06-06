/** Live hardware — two ESP32 circuits (House A + House B). */

export const CIRCUIT_HOUSES = [
  { id: 'HH-01', name: 'House A', key: 'houseA' },
  { id: 'HH-02', name: 'House B', key: 'houseB' },
];

export function resolveCircuit(householdId) {
  const id = (householdId || 'HH-01').toUpperCase();
  return CIRCUIT_HOUSES.find((c) => c.id === id) ?? CIRCUIT_HOUSES[0];
}

export function otherCircuit(householdId) {
  const current = resolveCircuit(householdId);
  return CIRCUIT_HOUSES.find((c) => c.id !== current.id) ?? CIRCUIT_HOUSES[1];
}
