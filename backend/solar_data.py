"""PVGIS-style irradiance and rural load profiles (Colab parity)."""

import random
from typing import List, Tuple

from config import HOUSEHOLD_SOLAR_PCT, HOURS, SOLAR_PANEL_KW_RANGE

# PVGIS hourly irradiance — Davao City (W/m²)
HOURLY_SOLAR_STATS = {
    0: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    1: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    2: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    3: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    4: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    5: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 8.0},
    6: {"min": 0.84, "q25": 82.59, "median": 113.80, "q75": 141.13, "max": 226.22},
    7: {"min": 0, "q25": 235.42, "median": 303.82, "q75": 354.26, "max": 477.64},
    8: {"min": 9.78, "q25": 386.42, "median": 488.53, "q75": 559.64, "max": 693.22},
    9: {"min": 11.93, "q25": 514.61, "median": 633.19, "q75": 718.73, "max": 867.50},
    10: {"min": 29.41, "q25": 580.40, "median": 728.67, "q75": 810.03, "max": 1001.21},
    11: {"min": 51.49, "q25": 580.36, "median": 728.64, "q75": 832.79, "max": 1068.97},
    12: {"min": 35.82, "q25": 540.55, "median": 677.41, "q75": 787.44, "max": 1051.04},
    13: {"min": 37.67, "q25": 459.97, "median": 578.58, "q75": 678.29, "max": 958.32},
    14: {"min": 15.70, "q25": 354.00, "median": 462.41, "q75": 538.46, "max": 784.97},
    15: {"min": 18.46, "q25": 219.10, "median": 294.20, "q75": 356.65, "max": 540.95},
    16: {"min": 8.40, "q25": 90.65, "median": 128.56, "q75": 166.97, "max": 284.33},
    17: {"min": 0, "q25": 0, "median": 12.55, "q75": 19.70, "max": 55.98},
    18: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    19: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    20: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    21: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    22: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    23: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
}

RURAL_BASE_LOAD = [
    0.10, 0.10, 0.10, 0.10, 0.15, 0.85, 0.25, 0.12, 0.10, 0.10, 0.10,
    0.15, 0.25, 0.12, 0.10, 0.10, 0.10, 0.35, 0.92, 0.22, 0.22, 0.21, 0.15, 0.12,
]


def sample_irradiance(day_seed: int) -> List[float]:
    rng = random.Random(day_seed)
    out: List[float] = []
    for hour in range(HOURS):
        s = HOURLY_SOLAR_STATS[hour]
        if s["median"] == 0:
            out.append(0.0)
            continue
        r = rng.random()
        if r < 0.25:
            lo, hi = s["min"], s["q25"]
        elif r < 0.50:
            lo, hi = s["q25"], s["median"]
        elif r < 0.75:
            lo, hi = s["median"], s["q75"]
        else:
            lo, hi = s["q75"], s["max"]
        out.append(round(rng.uniform(lo, hi), 2))
    return out


def generate_load_profiles(n: int, seed: int) -> Tuple[List[List[float]], List[float]]:
    rng = random.Random(seed)
    n_low = max(1, int(n * 0.2))
    n_mid = max(1, int(n * 0.7))
    n_high = max(1, n - n_low - n_mid)
    mults = [0.75] * n_low + [1.00] * n_mid + [1.30] * n_high
    rng.shuffle(mults)
    profiles: List[List[float]] = []
    for m in mults:
        row = []
        for h in range(HOURS):
            v = RURAL_BASE_LOAD[h] * m * rng.uniform(0.7, 1.3)
            row.append(round(max(0.05, v), 3))
        profiles.append(row)
    return profiles, mults


def generate_solar_profiles(
    irradiance: List[float], n: int, seed: int
) -> List[List[float]]:
    rng = random.Random(seed)
    out: List[List[float]] = []
    for _ in range(n):
        if rng.random() < HOUSEHOLD_SOLAR_PCT:
            panel_kw = rng.uniform(*SOLAR_PANEL_KW_RANGE)
        else:
            panel_kw = 0.0
        out.append(
            [round(panel_kw * (irradiance[h] / 1000) * 0.85, 3) for h in range(HOURS)]
        )
    return out
