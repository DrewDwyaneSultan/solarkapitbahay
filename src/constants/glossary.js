/** Plain-language definitions for dashboard and simulation jargon. */
export const GLOSSARY = {
  gini: {
    label: 'Gini coefficient',
    text: 'Measures how evenly energy savings are shared. 0 means perfectly fair; closer to 1 means one household benefits much more than others.',
  },
  soc: {
    label: 'State of Charge (SOC)',
    text: 'How full the battery is, as a percentage. 100% is fully charged; the community battery shares this level across connected houses.',
  },
  co2: {
    label: 'CO₂ offset',
    text: 'Estimated kilograms of carbon dioxide avoided by using shared solar instead of the grid. Uses the Philippines grid factor of 0.79 kg per kWh.',
  },
  gridReduction: {
    label: 'Grid reduction',
    text: 'How much less energy the community buys from the utility grid when houses share surplus solar through the community battery.',
  },
  greedy: {
    label: 'Greedy sharing',
    text: 'The ESP32 firmware sends surplus solar to whichever neighbor needs it most right now — no central server required during live operation.',
  },
  kmeans: {
    label: 'K-means clustering',
    text: 'Groups households with similar energy patterns (net load, battery level, grid use) so the operator can spot who should charge, discharge, or stay balanced.',
  },
  silhouette: {
    label: 'Silhouette score',
    text: 'How well-separated the clusters are, from −1 (poor) to 1 (excellent). Higher values mean clearer household groupings.',
  },
  inertia: {
    label: 'Inertia (WCSS)',
    text: 'Within-cluster sum of squares — a measure of how tight each cluster is. Lower values mean households in a group are more similar.',
  },
  netLoad: {
    label: 'Net load',
    text: 'Household energy use minus solar generation. Positive means drawing from grid or battery; negative means exporting surplus.',
  },
  surplus: {
    label: 'Surplus',
    text: 'When solar generation exceeds local use, the extra watts can be shared with a neighbor through the community battery.',
  },
  deficit: {
    label: 'Deficit',
    text: 'When local use exceeds solar generation, the house draws from the community battery or grid.',
  },
  computeTime: {
    label: 'Compute time',
    text: 'How long the backend took to run the greedy simulation (in milliseconds). Shorter is faster; this does not affect live ESP32 transfers.',
  },
  mqtt: {
    label: 'MQTT',
    text: 'A lightweight messaging protocol the ESP32 boards use to send live voltage, solar, and battery readings to the dashboard.',
  },
  relay: {
    label: 'Relay',
    text: 'An electronic switch on each ESP32 that turns the LED circuit on or off to show when energy is being shared between houses.',
  },
};
