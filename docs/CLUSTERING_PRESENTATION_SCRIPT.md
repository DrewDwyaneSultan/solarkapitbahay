# SolarKapitBahay — Modeling Stage Presentation Script

---

## 🚨 FINISH NOW — you’re at Section 5 (~1 min left)

**[SCREEN: dashboard clustering card — stay here, don’t open extra tabs]**

**5. Environment — 10 sec**

> “We used **Python** and **FastAPI** in `clustering.py`, **React** for the dashboard, **K-means k=3**, seed **42**.”

**6. Demo + metrics — 30 sec**

> “Each dot is a household — **net load** vs **battery SOC**. Blue **Charge**, amber **Discharge**, gray **Balanced**. Silhouette **0.29** — moderate separation for 15 households. **8 Charge, 4 Discharge, 3 Balanced**. Results come from `GET /api/clustering`.”

**7. Interpret + caveat — 12 sec**

> “Clusters overlap somewhat — expected for real barangay data. We use **Silhouette**, not Accuracy — this is **clustering**. Results fit **this Davao demo dataset** only.”

**8. Close — 8 sec**

> “Next: more real data, live ESP32 MQTT, tune **k**. Thank you.”

**Done. Stop recording.**

---

## Full script (short version — ~3 min 30 sec total)

Replace `[Name 1]` etc. with your names.

### 1. Intro — 15 sec

> “We are **[Name 1], [Name 2], [Name 3]**. Project: **SolarKapitBahay** — community solar and battery sharing for barangays.”

### 2. Objective — 15 sec

> “We recommend whether each household should **charge**, **discharge**, or stay **balanced**. Operator sees all households; members see their own.”

### 3. ML task — 15 sec

> “Task: **unsupervised K-means clustering**. Groups similar energy behavior, then maps clusters to battery actions.”

### 4. Dataset — 35 sec

**[SCREEN: `csvmerged2` or dashboard]**

> “**Rural Davao** merged file — PVGIS solar plus DOE load bands, 24 hours, expanded to **15 households**. Features: **net load**, **battery SOC**, **grid import**.”

> “CSV has hourly **deficit and surplus**. We map **Charge** to deficit-like and **Discharge** to surplus-like. **Balanced** is the middle K-means cluster — near-zero daily net load, a **hold** state so we don’t over-cycle batteries.”

### 5. Environment — 15 sec

**[SCREEN: `clustering.py`]**

> “**Python**, custom K-means in `clustering.py`, **FastAPI** API, **React** UI. **k=3**, seed **42**, min–max normalization.”

### 6. Demo + metrics — 40 sec

**[SCREEN: dashboard scatter + metrics panel]**

> “Scatter plot: net load vs SOC. **Silhouette ~0.29**, Inertia ~**1.03**. **8 / 4 / 3** Charge, Discharge, Balanced. API: `/api/clustering`.”

### 7. Interpret — 15 sec

> “Moderate separation — usable for a demo. Labels match energy logic. **Clustering metrics**, not Accuracy or F1.”

### 8. Close — 10 sec

> “Next: real sensor data, MQTT live overlay, elbow method for **k**. Thank you.”

---

## Quick reference

| Item | Value |
|------|-------|
| Task | K-means clustering, k=3 |
| Data | Rural Davao, 15 HH, 24 h |
| Features | Net load, SOC, grid import |
| Silhouette | ~0.289 |
| Results | 8 Charge / 4 Discharge / 3 Balanced |
| Stack | Python · FastAPI · React |

---

## One-liners (if Sir asks)

| Question | Answer |
|----------|--------|
| Why Balanced? | Middle cluster — near-neutral daily net load; hold, not charge/discharge. |
| Why not Accuracy? | Unsupervised — no labeled correct class. |
| Will results change? | Yes — different data, day, or k changes clusters. |
