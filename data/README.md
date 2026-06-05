# Merged household dataset

## Primary source (your file)

**`csvmerged2 (1).txt`** — Rural Davao hourly merged dataset (PVGIS + DOE load bands).

- 24 hourly rows with `load_min_kw` / `load_max_kw` / `solar_power_kw`
- Metadata: **15 households**, community battery 22.5 kWh
- The backend expands this into 15 household profiles (uniform load variation per metadata) and runs K-means clustering for charge / discharge / balanced indicators.

No changes needed if you keep this filename in `data/`.

## Fallback

**`merged_household_dataset.csv`** — auto-generated demo (50 HH × 24 h) if the txt file is removed.

```powershell
python backend/generate_merged_dataset.py
```

## API

- `GET /api/clustering` — operator scatter plot data
- `GET /api/clustering/HH-01` — household indicator
