# Household Clustering Module

## Project documentation summary (paragraphs)

SolarKapitBahay uses **K-means clustering** to group households by energy behavior and recommend a battery action for community energy sharing. Each household in the dataset is assigned one of three indicators: **Charge** (net demand exceeds local solar), **Discharge** (surplus available to share with neighbors), or **Balanced** (near equilibrium between load and generation). The barangay operator sees all clustered households on a scatter plot with **net load** on the horizontal axis and **battery state of charge (SOC)** on the vertical axis, with points color-coded by action. A **model evaluation panel** below the chart reports unsupervised quality metrics—Silhouette score, Inertia (within-cluster sum of squares), cluster count, and a plain-language interpretation—alongside the charge/discharge/balanced summary. Individual household members see their own recommended action on the household dashboard. Clustering is an analytics layer only; it does not directly control hardware but supports fair, data-driven decisions about when households should charge, hold, or discharge their batteries.

The clustering pipeline begins with hourly energy data from the seeded database, the rural Davao merged dataset (`csvmerged2`), or a generated CSV fallback. For the merged dataset, 24 shared hourly rows (PVGIS solar generation and DOE load bands) are expanded into **15 household profiles** by randomizing each hour’s consumption between the documented minimum and maximum load values. For each household, net load is computed as load minus solar, grid import as the positive portion of net load, and battery SOC is simulated hour-by-hour using a **1.5 kWh** battery model with **90%** round-trip efficiency and SOC limits of **20% to 95%**. Hourly records are aggregated into daily averages per household. K-means then runs on a three-dimensional feature vector—**net load (kWh)**, **battery SOC (%)**, and **grid import (kWh)**—after min–max normalization to [0, 1]. The algorithm uses **k = 3** clusters, a fixed random seed of **42**, up to **40** iterations, and Euclidean distance. Cluster centroids are ranked on normalized net load to assign operational meaning: the highest-net-load cluster maps to **Charge**, the lowest to **Discharge**, and the middle cluster to **Balanced**.

After clustering, the backend computes **Silhouette score** and **Inertia (WCSS)** on the normalized feature space and returns them in a `metrics` object on `GET /api/clustering`. On the seeded rural Davao dataset (15 households), a typical run yields a Silhouette score of approximately **0.29** and Inertia of approximately **1.03**, indicating moderate but meaningful separation—expected for a small community sample with overlapping load patterns. Classification metrics such as accuracy or F1 are not used because this is unsupervised clustering with no labeled ground truth.

When ESP32 devices are online via MQTT, **House A** and **House B** are overlaid on the same scatter plot as pulsing live points. These live households use a separate **rule-based** layer (`live_clustering.py`), not K-means: **Charge** when MQTT status is DEFICIT or instantaneous net load exceeds 20 W, **Discharge** when status is SURPLUS and transfer wattage exceeds 0.2 W, otherwise **Balanced**. Live net load and SOC are derived from real-time solar/load telemetry (SOC is a shared MQTT battery reading until per-household sensing is wired). The operator dashboard polls clustering every **2 seconds**, merging dataset clusters with live overlays through `GET /api/clustering` (or `GET /api/clustering/live` for MQTT-only data). Together, the K-means analytics and live rule layer turn energy readings into actionable guidance that supports SolarKapitBahay’s goal of equitable, community-scale solar and battery coordination in a barangay setting.

---

## Pipeline overview

The clustering pipeline begins with hourly energy data from the seeded database, the rural Davao merged dataset (`csvmerged2`), or a generated CSV fallback.

For the merged dataset, 24 shared hourly rows (PVGIS solar generation and DOE load bands) are expanded into **15 household profiles** by randomizing each hour’s consumption between the documented minimum and maximum load values. For each household, net load is computed as load minus solar, grid import as the positive portion of net load, and battery SOC is simulated hour-by-hour using a **1.5 kWh** battery model with **90%** round-trip efficiency and SOC limits of **20% to 95%**.

Hourly records are aggregated into **daily averages** per household for net load, battery SOC, grid import, load, and solar generation.

```
Hourly energy records (DB or merged dataset)
        ↓
Per-household aggregation (24 h → daily averages)
        ↓
3-feature vector + min–max normalization
        ↓
K-means (k = 3, seed = 42)
        ↓
Cluster quality metrics (Silhouette, Inertia)
        ↓
Cluster → action mapping (by centroid net load)
        ↓
GET /api/clustering  →  Dashboard UI (+ optional live MQTT overlay)
```

**Implementation:** [`backend/clustering.py`](../backend/clustering.py)  
**Live overlay:** [`backend/live_clustering.py`](../backend/live_clustering.py)  
**Dataset expansion:** [`backend/merged_dataset_loader.py`](../backend/merged_dataset_loader.py)

---

## Purpose

| Audience | What they see |
|----------|----------------|
| **Barangay operator** | Scatter plot (net load vs. SOC), color-coded actions, clustering metrics panel |
| **Household member** | Personal battery-sharing indicator on the household dashboard |
| **Live demo** | Pulsing dots for House A/B when MQTT telemetry is active |

---

## Input data

### Sources (priority order)

1. **Database** — `hourly_energy_records` when households are seeded (`household_count() > 0`)
2. **`data/csvmerged2 (1).txt`** — Rural Davao hourly merged dataset (PVGIS solar + DOE load bands)
3. **`data/merged_household_dataset.csv`** — Auto-generated fallback (50 households × 24 h)

### Battery simulation parameters

| Parameter | Value |
|-----------|-------|
| Capacity | 1.5 kWh per household |
| Efficiency | 90% |
| Min SOC | 20% |
| Max SOC | 95% |
| Initial SOC | 100% |

---

## Clustering features

K-means uses a **3-dimensional feature vector** per household:

| Feature | Description |
|---------|-------------|
| **Net load (kWh)** | `load − solar`; positive = deficit, negative = surplus |
| **Battery SOC (%)** | End-of-day state of charge from the battery simulation |
| **Grid import (kWh)** | Energy drawn from the grid (`max(0, net_load)`) |

Features are **min–max normalized** to [0, 1] before clustering so no single dimension dominates. `load_kwh` and `solar_kwh` are aggregated for display but are **not** direct clustering inputs.

---

## Algorithm

| Setting | Value |
|---------|-------|
| Method | K-means (custom implementation) |
| Clusters (k) | 3 |
| Random seed | 42 |
| Max iterations | 40 |
| Distance | Euclidean on normalized features |

### Action assignment

Clusters are labeled by sorting centroids on **normalized net load** (dimension 0):

| Centroid rank (net load) | Action | Meaning |
|--------------------------|--------|---------|
| Highest | **Charge** | Net demand exceeds local solar |
| Middle | **Balanced** | Near equilibrium; maintain SOC |
| Lowest | **Discharge** | Surplus available for sharing |

Action metadata (label, color, description) is defined in `ACTION_META` in `backend/clustering.py` and mirrored in [`src/constants/clustering.js`](../src/constants/clustering.js).

---

## Model evaluation

After K-means converges, the backend computes **unsupervised clustering metrics** on the normalized feature space and returns them in the API `metrics` object.

| Metric | What it measures | Typical reading (this project) |
|--------|------------------|--------------------------------|
| **Silhouette score** | How well each point fits its cluster vs. neighbors (−1 to 1) | ~**0.29** — moderate separation, expected for 15 households |
| **Inertia (WCSS)** | Within-cluster sum of squares; lower = tighter groups | ~**1.03** on normalized [0, 1] features |
| **Cluster sizes** | Household count per cluster | e.g. 3, 4, 8 |

### Interpretation

A Silhouette score between **0.25 and 0.5** is common on small real-world energy samples. It indicates that clusters are **meaningful but not perfectly separated** — which is reasonable given overlapping household load patterns in a single barangay day. The action labels still align with domain logic: high-net-load centroids map to Charge, low-net-load to Discharge, and the middle cluster to Balanced.

Classification metrics (Accuracy, Precision, Recall, F1, Confusion Matrix) and regression metrics (MAE, RMSE) are **not used** here because this is **unsupervised clustering** with no labeled ground-truth target.

### Example metrics (seeded rural Davao dataset)

```json
{
  "silhouette_score": 0.2888,
  "inertia_wcss": 1.034,
  "k": 3,
  "sample_count": 15,
  "cluster_sizes": [3, 4, 8],
  "silhouette_interpretation": "Moderate separation — typical for small household energy samples."
}
```

Action summary for the same run: **8 Charge**, **4 Discharge**, **3 Balanced**.

---

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/clustering` | All households, summary counts, `metrics`, optional `live_households` |
| `GET /api/clustering/live` | Live House A/B from MQTT only |
| `GET /api/clustering/{household_id}` | Single household record (e.g. `HH-01`) |

### Response fields (per household)

- `household_id`, `head_name`, `purok`
- `net_load_kwh`, `battery_soc_pct`, `grid_import_kwh`
- `cluster_id`, `action`, `action_label`, `action_color`, `action_description`
- `scatter_x` (= net load), `scatter_y` (= SOC)

### Top-level `metrics` object

- `algorithm`, `k`, `seed`, `max_iterations`, `features`, `scaling`
- `silhouette_score`, `inertia_wcss`, `silhouette_interpretation`
- `cluster_sizes`, `sample_count`

---

## Frontend

| Component | Location | Role |
|-----------|----------|------|
| `useClustering` | `src/hooks/useClustering.js` | Fetches operator overview (polls every 2 s) |
| `useHouseholdCluster` | `src/hooks/useClustering.js` | Fetches one household’s action |
| `ClusterScatterPlot` | Operator dashboard | X = net load, Y = SOC, color = action; live ring overlay |
| `ClusterMetrics` | Operator dashboard | Silhouette, Inertia, k, interpretation, action counts |
| `BatteryActionIndicator` | Household dashboard | Charge / discharge / balanced card |

Results are exposed through the FastAPI backend and rendered in the React frontend on the **operator dashboard** (`DashboardPage`) and **household dashboard** (`HouseholdDashboardPage`). Together, these components turn raw energy readings into actionable guidance that supports SolarKapitBahay’s goal of equitable, community-scale solar and battery coordination in a barangay setting.

---

## Related documentation

- Presentation script: [`CLUSTERING_PRESENTATION_SCRIPT.md`](CLUSTERING_PRESENTATION_SCRIPT.md)
- Dataset files: [`data/README.md`](../data/README.md)
- Database tables: [`docs/DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)
- Backend overview: [`backend/README.md`](../backend/README.md)
