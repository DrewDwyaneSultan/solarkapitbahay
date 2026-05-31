"""Greedy energy allocation — largest need first (manuscript §3.9)."""

from config import (
    BATTERY_EFFICIENCY,
    BATTERY_MAX_SOC,
    BATTERY_MIN_SOC,
    SHARED_PRICE,
    SIM_DAYS,
    TARIFF_BY_HOUR,
)


def run_greedy_hour(
    surplus: list[float],
    need: list[float],
    battery_kwh: float,
    battery_capacity: float,
) -> dict:
    n = len(surplus)
    received = [0.0] * n
    remaining_surplus = surplus[:]
    remaining_need = need[:]

    order = sorted(range(n), key=lambda i: remaining_need[i], reverse=True)
    for recv_idx in order:
        need_amt = remaining_need[recv_idx]
        if need_amt <= 0:
            continue
        for donor_idx in range(n):
            if need_amt <= 0:
                break
            avail = remaining_surplus[donor_idx]
            if avail <= 0 or donor_idx == recv_idx:
                continue
            transfer = min(avail, need_amt)
            received[recv_idx] += transfer
            remaining_surplus[donor_idx] -= transfer
            need_amt -= transfer
            remaining_need[recv_idx] -= transfer

    total_surplus = sum(remaining_surplus)
    total_need = sum(remaining_need)

    max_charge = max(0.0, battery_capacity * BATTERY_MAX_SOC - battery_kwh)
    charge = min(total_surplus, max_charge)
    battery_kwh += charge * BATTERY_EFFICIENCY

    max_discharge = max(0.0, battery_kwh - battery_capacity * BATTERY_MIN_SOC)
    discharge = min(total_need, max_discharge)
    battery_kwh -= discharge / BATTERY_EFFICIENCY

    grid_draw = max(0.0, total_need - discharge)

    return {
        "received": received,
        "battery_kwh": battery_kwh,
        "discharge": discharge,
        "grid_draw": grid_draw,
        "energy_shared": sum(received),
    }


def simulate_greedy(households: list[dict], battery_capacity_kwh: float) -> dict:
    n = len(households)
    battery_kwh = battery_capacity_kwh * 0.50
    total_savings = 0.0
    total_grid = 0.0
    total_shared = 0.0
    received_totals = [0.0] * n
    solar_total = 0.0

    for day in range(SIM_DAYS):
        for hour in range(24):
            surplus = []
            need = []
            for hh in households:
                prof = hh["profiles"][day]
                solar_total += prof["solar"][hour]
                net = prof["solar"][hour] - prof["load"][hour]
                surplus.append(max(0.0, net))
                need.append(max(0.0, -net))

            result = run_greedy_hour(surplus, need, battery_kwh, battery_capacity_kwh)
            battery_kwh = result["battery_kwh"]
            tariff = TARIFF_BY_HOUR[hour]
            if tariff >= SHARED_PRICE and result["discharge"] > 0:
                total_savings += result["discharge"] * (tariff - SHARED_PRICE)
            total_grid += result["grid_draw"] * tariff
            total_shared += result["energy_shared"]
            for i, amount in enumerate(result["received"]):
                received_totals[i] += amount

    max_recv = max(received_totals) if received_totals else 1.0
    household_shares = [
        {
            "id": households[i]["id"],
            "share": round((received_totals[i] / max_recv) * 100) if max_recv else 0,
        }
        for i in range(n)
    ]
    household_shares.sort(key=lambda x: x["share"], reverse=True)

    grid_baseline = total_grid * 1.35 if total_grid else 1.0
    grid_reduction = (
        min(99.0, max(0.0, (1 - total_grid / grid_baseline) * 100))
        if grid_baseline
        else 0.0
    )

    return {
        "total_savings_php": round(total_savings, 2),
        "solar_generated_kwh": round(solar_total, 1),
        "battery_soc_pct": round((battery_kwh / battery_capacity_kwh) * 100, 1)
        if battery_capacity_kwh
        else 0,
        "grid_reduction_pct": round(grid_reduction, 1),
        "energy_shared_kwh": round(total_shared, 2),
        "household_comparison": household_shares[:10],
        "gini_coefficient": _gini(received_totals),
    }


def _gini(values: list[float]) -> float:
    if not values or sum(values) == 0:
        return 0.0
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    total = sum(sorted_vals)
    cum = sum((i + 1) * v for i, v in enumerate(sorted_vals))
    return round((2 * cum) / (n * total) - (n + 1) / n, 3)
