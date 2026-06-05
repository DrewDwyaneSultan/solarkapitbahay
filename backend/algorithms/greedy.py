"""
Greedy P2P energy allocation — Colab parity (manuscript §3.9, TOPSIS winner).

Matches notebooks/SolarKapitBahay_Colab_Simulation.py:
  p2p_greedy → battery_dispatch → savings / grid / Gini metrics.
"""

from config import (
    BATTERY_EFFICIENCY,
    BATTERY_MAX_POWER_KW,
    BATTERY_MAX_SOC,
    BATTERY_MIN_SOC,
    GREEDY_HARDWARE_COST_PHP,
    GRID_PRICE_PEAK,
    MAX_HOUSEHOLD_DRAW_KW,
    SHARED_PRICE,
    grid_price,
)
from solar_data import generate_load_profiles, generate_solar_profiles, sample_irradiance


def _gini(values: list[float]) -> float:
    if not values or sum(values) == 0:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    cum = sum((i + 1) * v for i, v in enumerate(sorted_vals))
    return round((2 * cum) / (n * total) - (n + 1) / n, 3)


def p2p_greedy(
    surplus: list[float], need: list[float]
) -> tuple[list[float], list[float], list[float], list[float]]:
    n = len(surplus)
    rec = [0.0] * n
    giv = [0.0] * n
    s = surplus[:]
    d = [min(x, MAX_HOUSEHOLD_DRAW_KW) for x in need]

    receivers = sorted([i for i in range(n) if d[i] > 0], key=lambda i: d[i], reverse=True)
    donors = sorted([i for i in range(n) if s[i] > 0], key=lambda i: s[i], reverse=True)

    for donor in donors:
        if s[donor] <= 0:
            continue
        for recv in receivers:
            if recv == donor or d[recv] <= 0:
                continue
            transfer = min(s[donor], d[recv])
            if transfer <= 0:
                continue
            rec[recv] += transfer
            giv[donor] += transfer
            s[donor] -= transfer
            d[recv] -= transfer
    return rec, giv, s, d


def battery_dispatch(
    remaining_need: float,
    remaining_surplus: float,
    battery_soc: float,
    hour: int,
    battery_capacity_kwh: float,
) -> tuple[float, float, float]:
    """Returns (grid_draw_kwh, new_soc, discharge_kwh)."""
    price = grid_price(hour)
    is_peak = price >= GRID_PRICE_PEAK

    discharge = 0.0
    if remaining_need > 0 and battery_soc > BATTERY_MIN_SOC:
        avail = (battery_soc - BATTERY_MIN_SOC) * battery_capacity_kwh
        discharge = min(remaining_need, avail, BATTERY_MAX_POWER_KW)
        if not is_peak:
            discharge *= 0.5
        remaining_need -= discharge

    charge = 0.0
    if remaining_surplus > 0 and battery_soc < BATTERY_MAX_SOC:
        avail = (BATTERY_MAX_SOC - battery_soc) * battery_capacity_kwh
        charge = min(remaining_surplus, avail, BATTERY_MAX_POWER_KW)
        if not (11 <= hour <= 14):
            charge *= 0.7
        remaining_surplus -= charge

    net = (charge * BATTERY_EFFICIENCY - discharge / BATTERY_EFFICIENCY) / battery_capacity_kwh
    new_soc = max(BATTERY_MIN_SOC, min(BATTERY_MAX_SOC, battery_soc + net))
    return max(0.0, remaining_need), new_soc, discharge


def allocate_hour_greedy(
    surplus: list[float],
    need: list[float],
    battery_soc: float,
    hour: int,
    battery_capacity_kwh: float,
) -> dict:
    rec, _giv, rs, rd = p2p_greedy(surplus, need)
    rem_need = sum(rd)
    rem_sur = sum(rs)
    grid_draw, new_soc, discharge = battery_dispatch(
        rem_need, rem_sur, battery_soc, hour, battery_capacity_kwh
    )

    price = grid_price(hour)
    sharing_kwh = sum(rec)
    sharing_save = sharing_kwh * max(0.0, price - SHARED_PRICE)
    battery_save = (
        discharge * max(0.0, price - SHARED_PRICE) if price >= SHARED_PRICE else 0.0
    )

    return {
        "received": rec,
        "shared_kwh": sharing_kwh,
        "grid_draw": grid_draw,
        "battery_soc": new_soc,
        "discharge": discharge,
        "savings": sharing_save + battery_save,
    }


def simulate_greedy(
    num_households: int,
    battery_capacity_kwh: float,
    days: int = 30,
    seed: int = 42,
) -> dict:
    loads, _ = generate_load_profiles(num_households, seed)
    battery_soc = 0.50
    received_total = [0.0] * num_households

    total_savings = 0.0
    total_shared = 0.0
    total_grid = 0.0
    baseline_grid = 0.0
    solar_total = 0.0

    for day in range(days):
        irr = sample_irradiance(seed * 1000 + day)
        solar = generate_solar_profiles(irr, num_households, seed + day)

        for hour in range(24):
            price = grid_price(hour)
            surplus: list[float] = []
            need: list[float] = []

            for h in range(num_households):
                load = loads[h][hour]
                gen = solar[h][hour]
                solar_total += gen
                surplus.append(max(0.0, gen - load))
                need.append(max(0.0, load - gen))
                baseline_grid += max(0.0, load - gen) * price

            out = allocate_hour_greedy(surplus, need, battery_soc, hour, battery_capacity_kwh)
            battery_soc = out["battery_soc"]
            total_savings += out["savings"]
            total_shared += out["shared_kwh"]
            total_grid += out["grid_draw"] * price
            for i, amount in enumerate(out["received"]):
                received_total[i] += amount

    grid_reduction = (1 - total_grid / baseline_grid) * 100 if baseline_grid > 0 else 0.0
    monthly_savings = total_savings / days * 30 if days > 0 else 0.0
    payback_months = (
        GREEDY_HARDWARE_COST_PHP / monthly_savings if monthly_savings > 0 else None
    )

    max_recv = max(received_total) if received_total else 1.0
    household_shares = [
        {
            "id": f"HH-{i + 1:02d}",
            "share": round((received_total[i] / max_recv) * 100) if max_recv else 0,
        }
        for i in range(num_households)
    ]
    household_shares.sort(key=lambda x: x["share"], reverse=True)

    return {
        "total_savings_php": round(total_savings, 2),
        "monthly_savings_php": round(monthly_savings, 2),
        "solar_generated_kwh": round(solar_total, 1),
        "battery_soc_pct": round(battery_soc * 100, 1),
        "grid_reduction_pct": round(grid_reduction, 1),
        "energy_shared_kwh": round(total_shared, 2),
        "household_comparison": household_shares[:10],
        "gini_coefficient": _gini(received_total),
        "hardware_cost_php": GREEDY_HARDWARE_COST_PHP,
        "payback_months": round(payback_months, 1) if payback_months is not None else None,
        "simulation_days": days,
    }
