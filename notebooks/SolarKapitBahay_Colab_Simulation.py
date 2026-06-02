# =============================================================================
# SOLARKAPITBAHAY — Algorithm Comparison (Colab-ready)
# Greedy vs Linear Programming vs Hybrid + TOPSIS
#
# HOW TO USE IN GOOGLE COLAB:
#   1. New notebook → paste this entire file into one cell → Run
#   2. Or upload this file and:  %run SolarKapitBahay_Colab_Simulation.py
#
# Set QUICK_TEST = True  for fast demo (~1 min)
# Set QUICK_TEST = False for full multi-scale thesis run (~5–15 min)
# =============================================================================

!pip install pulp numpy pandas matplotlib -q

import time
import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pulp

warnings.filterwarnings("ignore")

# -----------------------------------------------------------------------------
# CONFIG — toggle here
# -----------------------------------------------------------------------------
QUICK_TEST = True  # False = full multi-scale (5, 10, 25, 50, 100 households)

# Battery (LiFePO4 community battery)
BATTERY_CAPACITY_KWH = 100.0
BATTERY_MIN_SOC = 0.20
BATTERY_MAX_SOC = 0.95
BATTERY_EFFICIENCY = 0.92
BATTERY_MAX_POWER_KW = 30.0

# Davao Light TOU (PHP/kWh) — aligned with backend/config.py
GRID_PRICE_PEAK = 12.70   # 6 PM – 9 PM
GRID_PRICE_MID = 10.58    # 5 AM – 5 PM, 9 PM – 10 PM
GRID_PRICE_OFF = 8.99     # 10 PM – 4 AM
SHARED_PRICE = 11.00      # neighbor sharing
EXPORT_PRICE = 5.00       # net metering export

# Hardware costs (PHP) for payback
HARDWARE_COST = {"Greedy": 1500, "LP": 5000, "Hybrid": 6500}

# Household / solar
MAX_HOUSEHOLD_DRAW_KW = 2.0
HOUSEHOLD_SOLAR_PCT = 0.60
SOLAR_PANEL_KW_RANGE = (1.0, 2.5)
ALPHA = 0.30  # LP fairness: min fraction of need served when feasible

DAYS_TO_SIMULATE = 30
NUM_RUNS = 5 if QUICK_TEST else 10
HOUSEHOLD_SCALES = [25] if QUICK_TEST else [5, 10, 25, 50, 100]

# TOPSIS weights: savings, grid reduction, fairness, speed, payback
TOPSIS_WEIGHTS = np.array([0.30, 0.20, 0.20, 0.15, 0.15])

# PVGIS hourly irradiance stats — Davao City (W/m²)
HOURLY_SOLAR_STATS = {
    0: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    1: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    2: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    3: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    4: {"min": 0, "q25": 0, "median": 0, "q75": 0, "max": 0},
    5: {"min": 0, "q25": 0, "median": 0, "q75": 8.0, "max": 15.41},
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


def grid_price(hour: int) -> float:
    if 18 <= hour <= 21:
        return GRID_PRICE_PEAK
    if 5 <= hour <= 17 or hour == 22:
        return GRID_PRICE_MID
    return GRID_PRICE_OFF


def sample_irradiance(day_seed: int) -> list[float]:
    rng = np.random.default_rng(day_seed)
    out = []
    for hour in range(24):
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
        out.append(round(float(rng.uniform(lo, hi)), 2))
    return out


def generate_load_profiles(n: int, seed: int) -> tuple[list[list[float]], list[float]]:
    rng = np.random.default_rng(seed)
    n_low = max(1, int(n * 0.2))
    n_mid = max(1, int(n * 0.7))
    n_high = max(1, n - n_low - n_mid)
    mults = [0.75] * n_low + [1.00] * n_mid + [1.30] * n_high
    rng.shuffle(mults)
    profiles = []
    for m in mults:
        row = []
        for h in range(24):
            v = RURAL_BASE_LOAD[h] * m * rng.uniform(0.7, 1.3)
            row.append(round(max(0.05, v), 3))
        profiles.append(row)
    return profiles, mults


def generate_solar_profiles(
    irradiance: list[float], n: int, seed: int
) -> list[list[float]]:
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        if rng.random() < HOUSEHOLD_SOLAR_PCT:
            panel_kw = rng.uniform(*SOLAR_PANEL_KW_RANGE)
        else:
            panel_kw = 0.0
        out.append(
            [round(panel_kw * (irradiance[h] / 1000) * 0.85, 3) for h in range(24)]
        )
    return out


def gini(values: list[float]) -> float:
    if not values or sum(values) == 0:
        return 0.0
    v = sorted(values)
    n = len(v)
    t = sum(v)
    return (2 * sum((i + 1) * x for i, x in enumerate(v))) / (n * t) - (n + 1) / n


def battery_dispatch(
    remaining_need: float,
    remaining_surplus: float,
    battery_soc: float,
    hour: int,
) -> tuple[float, float, float]:
    """Returns (grid_draw, new_soc, discharge_kwh)."""
    price = grid_price(hour)
    is_peak = price >= GRID_PRICE_PEAK

    discharge = 0.0
    if remaining_need > 0 and battery_soc > BATTERY_MIN_SOC:
        avail = (battery_soc - BATTERY_MIN_SOC) * BATTERY_CAPACITY_KWH
        discharge = min(remaining_need, avail, BATTERY_MAX_POWER_KW)
        if not is_peak:
            discharge *= 0.5
        remaining_need -= discharge

    charge = 0.0
    if remaining_surplus > 0 and battery_soc < BATTERY_MAX_SOC:
        avail = (BATTERY_MAX_SOC - battery_soc) * BATTERY_CAPACITY_KWH
        charge = min(remaining_surplus, avail, BATTERY_MAX_POWER_KW)
        if not (11 <= hour <= 14):
            charge *= 0.7
        remaining_surplus -= charge

    net = (charge * BATTERY_EFFICIENCY - discharge / BATTERY_EFFICIENCY) / BATTERY_CAPACITY_KWH
    new_soc = float(np.clip(battery_soc + net, BATTERY_MIN_SOC, BATTERY_MAX_SOC))
    return max(0.0, remaining_need), new_soc, discharge


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
            t = min(s[donor], d[recv])
            if t <= 0:
                continue
            rec[recv] += t
            giv[donor] += t
            s[donor] -= t
            d[recv] -= t
    return rec, giv, s, d


def p2p_lp(
    surplus: list[float], need: list[float], hour: int, alpha: float = ALPHA
) -> tuple[list[float], list[float], list[float], list[float], bool]:
    n = len(surplus)
    s = surplus[:]
    d = [min(x, MAX_HOUSEHOLD_DRAW_KW) for x in need]
    total_s, total_d = sum(s), sum(d)

    if total_s == 0 or total_d == 0:
        rec, giv, rs, rd = p2p_greedy(surplus, need)
        return rec, giv, rs, rd, False

    price = grid_price(hour)
    benefit = max(0.01, price - SHARED_PRICE)

    prob = pulp.LpProblem("SKB_P2P", pulp.LpMaximize)
    x = pulp.LpVariable.dicts("x", ((i, j) for i in range(n) for j in range(n) if i != j), lowBound=0)

    prob += pulp.lpSum(x[i, j] * benefit for i in range(n) for j in range(n) if i != j)

    for i in range(n):
        prob += pulp.lpSum(x[i, j] for j in range(n) if i != j) <= s[i]
    for j in range(n):
        prob += pulp.lpSum(x[i, j] for i in range(n) if i != j) <= d[j]

    # Fairness only if feasible
    if total_s >= alpha * total_d:
        for j in range(n):
            if d[j] > 0:
                prob += pulp.lpSum(x[i, j] for i in range(n) if i != j) >= alpha * d[j]

    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    if pulp.LpStatus[prob.status] != "Optimal":
        rec, giv, rs, rd = p2p_greedy(surplus, need)
        return rec, giv, rs, rd, False

    rec = [0.0] * n
    giv = [0.0] * n
    for i in range(n):
        for j in range(n):
            if i != j and x[i, j].value():
                v = x[i, j].value()
                rec[j] += v
                giv[i] += v
    rs = [max(0.0, s[i] - giv[i]) for i in range(n)]
    rd = [max(0.0, d[j] - rec[j]) for j in range(n)]
    return rec, giv, rs, rd, True


def allocate_hour(
    surplus: list[float],
    need: list[float],
    battery_soc: float,
    hour: int,
    algo: str,
) -> dict:
    if algo == "Greedy":
        rec, giv, rs, rd = p2p_greedy(surplus, need)
    elif algo == "LP":
        rec, giv, rs, rd, _ = p2p_lp(surplus, need, hour)
    else:  # Hybrid
        rec, giv, rs, rd, _ = p2p_lp(surplus, need, hour)
        rec2, giv2, rs, rd = p2p_greedy(rs, rd)
        rec = [rec[i] + rec2[i] for i in range(len(rec))]
        giv = [giv[i] + giv2[i] for i in range(len(giv))]

    rem_need = sum(rd)
    rem_sur = sum(rs)
    grid_draw, new_soc, discharge = battery_dispatch(rem_need, rem_sur, battery_soc, hour)

    price = grid_price(hour)
    sharing_kwh = sum(rec)
    sharing_save = sharing_kwh * max(0.0, price - SHARED_PRICE)
    battery_save = discharge * max(0.0, price - SHARED_PRICE) if price >= SHARED_PRICE else 0.0

    return {
        "received": rec,
        "shared_kwh": sharing_kwh,
        "grid_draw": grid_draw,
        "battery_soc": new_soc,
        "discharge": discharge,
        "savings": sharing_save + battery_save,
    }


def run_scenario(num_households: int, algo: str, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    loads, _ = generate_load_profiles(num_households, seed)
    battery_soc = 0.50
    received_total = [0.0] * num_households

    total_savings = 0.0
    total_shared = 0.0
    total_grid = 0.0
    baseline_grid = 0.0
    total_load = 0.0

    t0 = time.perf_counter()

    for day in range(DAYS_TO_SIMULATE):
        irr = sample_irradiance(seed * 1000 + day)
        solar = generate_solar_profiles(irr, num_households, seed + day)

        for hour in range(24):
            price = grid_price(hour)
            surplus, need = [], []
            for h in range(num_households):
                load = loads[h][hour]
                gen = solar[h][hour]
                total_load += load
                surplus.append(max(0.0, gen - load))
                need.append(max(0.0, load - gen))
                baseline_grid += max(0.0, load - gen) * price

            out = allocate_hour(surplus, need, battery_soc, hour, algo)
            battery_soc = out["battery_soc"]
            total_savings += out["savings"]
            total_shared += out["shared_kwh"]
            total_grid += out["grid_draw"] * price
            for i, v in enumerate(out["received"]):
                received_total[i] += v

    elapsed = time.perf_counter() - t0
    grid_reduction = (1 - total_grid / baseline_grid) * 100 if baseline_grid > 0 else 0.0
    monthly_savings = total_savings / DAYS_TO_SIMULATE * 30

    return {
        "savings": total_savings,
        "monthly_savings": monthly_savings,
        "shared_kwh": total_shared,
        "grid_cost": total_grid,
        "grid_reduction": grid_reduction,
        "gini": gini(received_total),
        "time_sec": elapsed,
        "battery_soc_final": battery_soc,
    }


def run_multi(num_households: int, num_runs: int) -> dict:
    algos = ["Greedy", "LP", "Hybrid"]
    buckets = {a: [] for a in algos}
    print(f"  {num_households} households × {num_runs} runs...", end=" ", flush=True)
    for run in range(num_runs):
        for algo in algos:
            buckets[algo].append(run_scenario(num_households, algo, seed=run + num_households * 100))
    print("done")

    summary = {}
    for algo in algos:
        rows = buckets[algo]
        ms = np.mean([r["monthly_savings"] for r in rows])
        hw = HARDWARE_COST[algo]
        summary[algo] = {
            "savings_mean": np.mean([r["savings"] for r in rows]),
            "savings_std": np.std([r["savings"] for r in rows]),
            "monthly_savings_mean": ms,
            "monthly_savings_std": np.std([r["monthly_savings"] for r in rows]),
            "grid_reduction_mean": np.mean([r["grid_reduction"] for r in rows]),
            "grid_reduction_std": np.std([r["grid_reduction"] for r in rows]),
            "gini_mean": np.mean([r["gini"] for r in rows]),
            "gini_std": np.std([r["gini"] for r in rows]),
            "time_mean": np.mean([r["time_sec"] for r in rows]),
            "time_std": np.std([r["time_sec"] for r in rows]),
            "payback_months": hw / ms if ms > 0 else float("inf"),
            "hardware_cost": hw,
        }
    return summary


def topsis_scores(results_by_scale: dict) -> tuple[str, dict, dict]:
    algos = ["Greedy", "LP", "Hybrid"]
    scale_scores = {a: [] for a in algos}

    for scale, res in results_by_scale.items():
        matrix = []
        for a in algos:
            r = res[a]
            matrix.append([
                r["monthly_savings_mean"],
                r["grid_reduction_mean"],
                1 - r["gini_mean"],
                1 / (r["time_mean"] + 1e-6),
                1 / (r["payback_months"] + 1e-6) if r["payback_months"] != float("inf") else 0,
            ])
        m = np.array(matrix, dtype=float)
        norm = m / np.sqrt((m ** 2).sum(axis=0) + 1e-12)
        weighted = norm * TOPSIS_WEIGHTS
        ideal_best = weighted.max(axis=0)
        ideal_worst = weighted.min(axis=0)
        d_best = np.sqrt(((weighted - ideal_best) ** 2).sum(axis=1))
        d_worst = np.sqrt(((weighted - ideal_worst) ** 2).sum(axis=1))
        scores = d_worst / (d_best + d_worst + 1e-12)
        for i, a in enumerate(algos):
            scale_scores[a].append(scores[i])

    avg = {a: float(np.mean(scale_scores[a])) for a in algos}
    winner = max(avg, key=avg.get)
    return winner, avg, scale_scores


def print_results(results_by_scale: dict) -> None:
    print("\n" + "=" * 88)
    print("RESULTS BY SCALE (mean ± std)")
    print("=" * 88)
    for scale, res in results_by_scale.items():
        print(f"\n--- {scale} households ---")
        print(f"{'Algo':<8} {'Savings ₱':<18} {'Monthly ₱':<16} {'Grid Red %':<14} {'Gini':<10} {'Time s':<8}")
        for a in ["Greedy", "LP", "Hybrid"]:
            r = res[a]
            print(
                f"{a:<8} {r['savings_mean']:>8.0f}±{r['savings_std']:<6.0f} "
                f"{r['monthly_savings_mean']:>8.0f}±{r['monthly_savings_std']:<5.0f} "
                f"{r['grid_reduction_mean']:>6.1f}±{r['grid_reduction_std']:<4.1f}   "
                f"{r['gini_mean']:.3f}±{r['gini_std']:.3f}  {r['time_mean']:.3f}"
            )


def plot_results(results_by_scale: dict, scale_scores: dict) -> None:
    scales = list(results_by_scale.keys())
    algos = ["Greedy", "LP", "Hybrid"]
    colors = ["#F5A623", "#2E5A4C", "#E86A2C"]

    fig, axes = plt.subplots(2, 2, figsize=(12, 9))
    for i, algo in enumerate(algos):
        axes[0, 0].plot(
            scales,
            [results_by_scale[s][algo]["monthly_savings_mean"] for s in scales],
            "o-", color=colors[i], label=algo, linewidth=2,
        )
        axes[0, 1].plot(
            scales,
            [results_by_scale[s][algo]["gini_mean"] for s in scales],
            "s-", color=colors[i], label=algo, linewidth=2,
        )
        axes[1, 0].plot(
            scales,
            [results_by_scale[s][algo]["grid_reduction_mean"] for s in scales],
            "D-", color=colors[i], label=algo, linewidth=2,
        )
        axes[1, 1].plot(
            scales,
            scale_scores[algo],
            "p-", color=colors[i], label=algo, linewidth=2,
        )

    axes[0, 0].set(title="Monthly Savings", xlabel="Households", ylabel="₱")
    axes[0, 1].set(title="Gini (lower = fairer)", xlabel="Households")
    axes[0, 1].axhline(0.4, color="red", ls="--", alpha=0.5)
    axes[1, 0].set(title="Grid Reduction vs Baseline", xlabel="Households", ylabel="%")
    axes[1, 1].set(title="TOPSIS Score", xlabel="Scale index")
    for ax in axes.flat:
        ax.legend()
        ax.grid(alpha=0.3)
    plt.suptitle("SolarKapitBahay — Greedy vs LP vs Hybrid", fontweight="bold")
    plt.tight_layout()
    plt.savefig("solar_kapitbahay_results.png", dpi=150, bbox_inches="tight")
    plt.show()


def export_csv(results_by_scale: dict, scale_scores: dict) -> pd.DataFrame:
    rows = []
    for scale, res in results_by_scale.items():
        for i, algo in enumerate(["Greedy", "LP", "Hybrid"]):
            r = res[algo]
            rows.append({
                "households": scale,
                "algorithm": algo,
                "savings_php": r["savings_mean"],
                "monthly_savings_php": r["monthly_savings_mean"],
                "grid_reduction_pct": r["grid_reduction_mean"],
                "gini": r["gini_mean"],
                "time_sec": r["time_mean"],
                "payback_months": r["payback_months"],
                "hardware_cost_php": r["hardware_cost"],
                "topsis_score": scale_scores[algo][list(results_by_scale.keys()).index(scale)],
            })
    df = pd.DataFrame(rows)
    df.to_csv("solar_kapitbahay_results.csv", index=False)
    return df


# =============================================================================
# MAIN
# =============================================================================
print("=" * 88)
print("SOLARKAPITBAHAY — Algorithm Comparison (Greedy | LP | Hybrid + TOPSIS)")
print("=" * 88)
print(f"Mode: {'QUICK TEST' if QUICK_TEST else 'FULL MULTI-SCALE'}")
print(f"Scales: {HOUSEHOLD_SCALES} | Days: {DAYS_TO_SIMULATE} | Runs: {NUM_RUNS}")
print(f"Battery: {BATTERY_CAPACITY_KWH} kWh | Shared: ₱{SHARED_PRICE}/kWh | Fairness α={ALPHA}")

results_by_scale = {}
for n in HOUSEHOLD_SCALES:
    results_by_scale[n] = run_multi(n, NUM_RUNS)

print_results(results_by_scale)

winner, avg_topsis, scale_scores = topsis_scores(results_by_scale)
print("\n" + "=" * 88)
print("TOPSIS WINNER (average across scales)")
print("=" * 88)
for a in ["Greedy", "LP", "Hybrid"]:
    r = results_by_scale[HOUSEHOLD_SCALES[-1]][a]
    print(f"  {a:<8} TOPSIS={avg_topsis[a]:.4f}  Payback={r['payback_months']:.1f} mo  HW=₱{r['hardware_cost']:,}")
print(f"\n  WINNER: {winner}")

df = export_csv(results_by_scale, scale_scores)
plot_results(results_by_scale, scale_scores)
print("\nSaved: solar_kapitbahay_results.csv, solar_kapitbahay_results.png")
print("Done.")
