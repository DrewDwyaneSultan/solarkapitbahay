"""
K-means clustering on merged household CSV → charge / discharge / balanced indicators.

Scatter axes (operator view): net_load_kwh (x) vs battery_soc_pct (y).
"""

from __future__ import annotations

import csv
import random
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
MERGED_TXT = ROOT / "data" / "csvmerged2 (1).txt"
DEFAULT_CSV = ROOT / "data" / "merged_household_dataset.csv"

COLUMN_ALIASES = {
    "household_id": ("household_id", "hh_id", "id", "HH_ID"),
    "net_load_kwh": ("net_load_kwh", "net_load", "net_energy_kwh", "net_kwh"),
    "battery_soc_pct": ("battery_soc_pct", "battery_soc", "soc_pct", "soc"),
    "grid_import_kwh": ("grid_import_kwh", "grid_import", "import_kwh"),
    "load_kwh": ("load_kwh", "load", "demand_kwh"),
    "solar_kwh": ("solar_kwh", "solar", "generation_kwh", "pv_kwh"),
    "head_name": ("head_name", "name", "head"),
    "purok": ("purok", "address", "barangay_zone"),
    "has_battery": ("has_battery", "battery"),
}

ACTION_META = {
    "charge": {
        "label": "Charge",
        "description": "Battery should charge — net demand exceeds local solar.",
        "color": "#2563eb",
    },
    "discharge": {
        "label": "Discharge",
        "description": "Battery should discharge / share — surplus available.",
        "color": "#d97706",
    },
    "balanced": {
        "label": "Balanced",
        "description": "Near equilibrium — maintain SOC, minimal grid draw.",
        "color": "#6b7280",
    },
}


def _resolve_col(row: dict[str, str], key: str) -> str | None:
    lower = {k.strip().lower(): k for k in row}
    for alias in COLUMN_ALIASES.get(key, (key,)):
        if alias.lower() in lower:
            return lower[alias.lower()]
    return None


def _float(row: dict[str, str], key: str, default: float = 0.0) -> float:
    col = _resolve_col(row, key)
    if not col:
        return default
    try:
        return float(row[col] or 0)
    except ValueError:
        return default


def _str(row: dict[str, str], key: str, default: str = "") -> str:
    col = _resolve_col(row, key)
    return (row[col].strip() if col and row[col] else default)


def _resolve_dataset_path(path: Path | None = None) -> Path:
    if path is not None:
        return path
    if MERGED_TXT.is_file():
        return MERGED_TXT
    return DEFAULT_CSV


def load_csv_rows(path: Path | None = None) -> list[dict[str, str]]:
    if path is None:
        try:
            from database import household_count, load_hourly_rows_from_db

            if household_count() > 0:
                db_rows = load_hourly_rows_from_db()
                if db_rows:
                    return db_rows
        except Exception:
            pass

    dataset_path = _resolve_dataset_path(path)

    if dataset_path == MERGED_TXT or dataset_path.suffix.lower() == ".txt":
        from merged_dataset_loader import expand_to_household_rows

        rows = expand_to_household_rows(dataset_path)
        if rows:
            return rows

    if not dataset_path.is_file():
        from generate_merged_dataset import main as build_csv

        build_csv()
        dataset_path = DEFAULT_CSV

    with dataset_path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def aggregate_households(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    buckets: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        hid = _str(row, "household_id", "HH-00")
        buckets.setdefault(hid, []).append(row)

    aggregated = []
    for hid, group in sorted(buckets.items()):
        n = len(group)
        net_mean = sum(_float(r, "net_load_kwh") for r in group) / n
        soc_mean = sum(_float(r, "battery_soc_pct") for r in group) / n
        import_mean = sum(_float(r, "grid_import_kwh") for r in group) / n
        load_mean = sum(_float(r, "load_kwh") for r in group) / n
        solar_mean = sum(_float(r, "solar_kwh") for r in group) / n
        has_bat = max(int(_float(r, "has_battery")) for r in group)
        aggregated.append({
            "household_id": hid,
            "head_name": _str(group[0], "head_name", hid),
            "purok": _str(group[0], "purok", ""),
            "net_load_kwh": round(net_mean, 4),
            "battery_soc_pct": round(soc_mean, 1),
            "grid_import_kwh": round(import_mean, 4),
            "load_kwh": round(load_mean, 4),
            "solar_kwh": round(solar_mean, 4),
            "has_battery": bool(has_bat),
            "samples": n,
        })
    return aggregated


def _kmeans(points: list[list[float]], k: int, seed: int = 42, max_iter: int = 40) -> tuple[list[int], list[list[float]]]:
    if len(points) < k:
        labels = list(range(len(points)))
        return labels, [p[:] for p in points[:k]]

    rng = random.Random(seed)
    dim = len(points[0])
    centroids = [points[i][:] for i in rng.sample(range(len(points)), k)]
    labels = [0] * len(points)

    for _ in range(max_iter):
        for i, p in enumerate(points):
            labels[i] = min(
                range(k),
                key=lambda j: sum((p[d] - centroids[j][d]) ** 2 for d in range(dim)),
            )
        sums = [[0.0] * dim for _ in range(k)]
        counts = [0] * k
        for i, p in enumerate(points):
            c = labels[i]
            counts[c] += 1
            for d in range(dim):
                sums[c][d] += p[d]
        for j in range(k):
            if counts[j]:
                centroids[j] = [sums[j][d] / counts[j] for d in range(dim)]

    return labels, centroids


def _euclidean(a: list[float], b: list[float]) -> float:
    return sum((a[d] - b[d]) ** 2 for d in range(len(a))) ** 0.5


def _inertia(points: list[list[float]], labels: list[int], centroids: list[list[float]]) -> float:
    """Within-cluster sum of squares (WCSS) on normalized features — lower is tighter."""
    return sum(
        sum((points[i][d] - centroids[labels[i]][d]) ** 2 for d in range(len(points[i])))
        for i in range(len(points))
    )


def _silhouette_score(points: list[list[float]], labels: list[int]) -> float | None:
    """
    Mean silhouette coefficient in [-1, 1].
    Typical interpretation: 0.25–0.5 = moderate separation (common on small real datasets).
    """
    n = len(points)
    if n < 2 or len(set(labels)) < 2:
        return None

    scores: list[float] = []
    for i in range(n):
        same = [j for j in range(n) if labels[j] == labels[i] and j != i]
        if not same:
            continue
        a = sum(_euclidean(points[i], points[j]) for j in same) / len(same)

        b = float("inf")
        for cluster in set(labels):
            if cluster == labels[i]:
                continue
            others = [j for j in range(n) if labels[j] == cluster]
            if others:
                mean_dist = sum(_euclidean(points[i], points[j]) for j in others) / len(others)
                b = min(b, mean_dist)

        if b == float("inf"):
            continue
        denom = max(a, b)
        scores.append((b - a) / denom if denom > 0 else 0.0)

    return round(sum(scores) / len(scores), 4) if scores else None


def _silhouette_interpretation(score: float | None) -> str:
    if score is None:
        return "Not enough clusters to score."
    if score >= 0.5:
        return "Good separation — clusters are reasonably distinct."
    if score >= 0.25:
        return "Moderate separation — typical for small household energy samples."
    if score >= 0:
        return "Weak structure — clusters overlap; consider feature tuning or different k."
    return "Poor fit — points may be closer to other clusters than their own."


def _normalize_matrix(rows: list[list[float]]) -> tuple[list[list[float]], list[float], list[float]]:
    if not rows:
        return [], [], []
    dim = len(rows[0])
    mins = [min(r[d] for r in rows) for d in range(dim)]
    maxs = [max(r[d] for r in rows) for d in range(dim)]
    scaled = []
    for r in rows:
        scaled.append([
            (r[d] - mins[d]) / (maxs[d] - mins[d] + 1e-9) for d in range(dim)
        ])
    return scaled, mins, maxs


def _assign_actions(centroids: list[list[float]]) -> dict[int, str]:
    """Map cluster index → charge/discharge/balanced using centroid net_load (dim 0)."""
    order = sorted(range(len(centroids)), key=lambda j: centroids[j][0], reverse=True)
    if len(order) == 1:
        return {order[0]: "balanced"}
    if len(order) == 2:
        return {order[0]: "charge", order[1]: "discharge"}
    return {order[0]: "charge", order[1]: "balanced", order[2]: "discharge"}


def _apply_household_action(h: dict[str, Any], action: str, *, manual: bool = False) -> None:
    action_meta = ACTION_META[action]
    h["action"] = action
    h["action_label"] = action_meta["label"]
    h["action_color"] = action_meta["color"]
    h["action_description"] = action_meta["description"]
    if manual:
        h["cluster_manual"] = True


def run_clustering(csv_path: Path | None = None, k: int = 3, seed: int = 42) -> dict[str, Any]:
    dataset_path = _resolve_dataset_path(csv_path)
    raw = load_csv_rows(csv_path)
    households = aggregate_households(raw)
    if not households:
        return {"households": [], "summary": {}, "dataset_path": str(dataset_path)}

    dataset_meta: dict[str, Any] = {"source": "csv"}
    try:
        from database import get_active_dataset, household_count

        if csv_path is None and household_count() > 0:
            active = get_active_dataset()
            if active:
                dataset_meta = {"source": "database", **active}
    except Exception:
        pass

    if dataset_meta.get("source") == "csv" and dataset_path == MERGED_TXT:
        from merged_dataset_loader import dataset_info

        dataset_meta = {"source": "rural_davao_merged_txt", **dataset_info(dataset_path)}

    features = [
        [h["net_load_kwh"], h["battery_soc_pct"], h["grid_import_kwh"]]
        for h in households
    ]
    scaled, _, _ = _normalize_matrix(features)
    k = min(k, len(households))
    labels, centroids = _kmeans(scaled, k, seed=seed)
    action_by_cluster = _assign_actions(centroids)

    overrides: dict[str, str] = {}
    try:
        from database import load_cluster_overrides

        overrides = load_cluster_overrides()
    except Exception:
        pass

    for i, h in enumerate(households):
        hid = h["household_id"]
        if hid in overrides:
            _apply_household_action(h, overrides[hid], manual=True)
            h["cluster_id"] = -1
        else:
            action = action_by_cluster[labels[i]]
            _apply_household_action(h, action)
            h["cluster_id"] = int(labels[i])
        h["scatter_x"] = h["net_load_kwh"]
        h["scatter_y"] = h["battery_soc_pct"]

    summary = {
        a: sum(1 for h in households if h["action"] == a)
        for a in ACTION_META
    }

    inertia = round(_inertia(scaled, labels, centroids), 4)
    silhouette = _silhouette_score(scaled, labels)
    cluster_sizes = [sum(1 for lb in labels if lb == j) for j in range(k)]

    return {
        "households": households,
        "summary": summary,
        "cluster_count": k,
        "dataset_path": str(dataset_path),
        "dataset_meta": dataset_meta,
        "total_rows": len(raw),
        "metrics": {
            "algorithm": "k-means",
            "k": k,
            "seed": seed,
            "max_iterations": 40,
            "feature_count": 3,
            "features": ["net_load_kwh", "battery_soc_pct", "grid_import_kwh"],
            "scaling": "min-max [0, 1]",
            "inertia_wcss": inertia,
            "silhouette_score": silhouette,
            "silhouette_interpretation": _silhouette_interpretation(silhouette),
            "cluster_sizes": cluster_sizes,
            "sample_count": len(households),
        },
    }


def get_household_cluster(household_id: str, csv_path: Path | None = None) -> dict[str, Any] | None:
    data = run_clustering(csv_path)
    hid = household_id.strip().upper()
    for h in data["households"]:
        if h["household_id"].upper() == hid:
            return h
    return None
