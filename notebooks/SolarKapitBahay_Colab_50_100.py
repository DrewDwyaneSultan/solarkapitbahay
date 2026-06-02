# =============================================================================
# SOLARKAPITBAHAY — Algorithm Comparison (50 & 100 Households)
# Greedy vs Linear Programming vs Hybrid + TOPSIS
#
# HOW TO USE IN GOOGLE COLAB:
#   Cell 1: !pip install pulp numpy pandas matplotlib -q
#   Cell 2: paste this entire file (without the pip line below) → Run
#
# Scales: 50 and 100 households (large barangay)
# Runtime: ~5–20 min depending on Colab CPU (LP is slower at 100 HH)
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
# CONFIG — 50 & 100 households only
# -----------------------------------------------------------------------------
HOUSEHOLD_SCALES = [50, 100]
DAYS_TO_SIMULATE = 30
NUM_RUNS = 10          # use 5 for faster test runs

# Battery (LiFePO4 community battery)
BATTERY_CAPACITY_KWH = 100.0
BATTERY_MIN_SOC = 0.20
BATTERY_MAX_SOC = 0.95
BATTERY_EFFICIENCY = 0.92
BATTERY_MAX_POWER_KW = 30.0

# Davao Light TOU (PHP/kWh)
GRID_PRICE_PEAK = 12.70
GRID_PRICE_MID = 10.58
GRID_PRICE_OFF = 8.99
SHARED_PRICE = 11.00
EXPORT_PRICE = 5.00

HARDWARE_COST = {"Greedy": 1500, "LP": 5000, "Hybrid": 6500}

MAX_HOUSEHOLD_DRAW_KW = 2.0
HOUSEHOLD_SOLAR_PCT = 0.60
SOLAR_PANEL_KW_RANGE = (1.0, 2.5)
ALPHA = 0.30

TOPSIS_WEIGHTS = np.array([0.30, 0.20, 0.20, 0.15, 0.15])

OUTPUT_CSV = "solar_kapitbahay_50_100_results.csv"
OUTPUT_PNG = "solar_kapitbahay_50_100_results.png"

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

HW_BY_SCALE = {
    50: "Hybrid (ESP32 + Raspberry Pi 4) — ₱6,500",
    100: "Raspberry Pi 4 + Cloud — ₱5,000 (LP node)",
}


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


def generate_solar_profiles(irradiance: list[float], n: int, seed: int) -> list[list[float]]:
    rng = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        panel_kw = rng.uniform(*SOLAR_PANEL_KW_RANGE) if rng.random() < HOUSEHOLD_SOLAR_PCT else 0.0
        out.append([round(panel_kw * (irradiance[h] / 1000) * 0.85, 3) for h in range(24)])
    return out


def gini(values: list[float]) -> float:
    if not values or sum(values) == 0:
        return 0.0
    v = sorted(values)
    n = len(v)
    t = sum(v)
    return (2 * sum((i + 1) * x for i, x in enumerate(v))) / (n * t) - (n + 1) / n


def battery_dispatch(remaining_need, remaining_surplus, battery_soc, hour):
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


def p2p_greedy(surplus, need):
    n = len(surplus)
    rec, giv = [0.0] * n, [0.0] * n
    s, d = surplus[:], [min(x, MAX_HOUSEHOLD_DRAW_KW) for x in need]
    receivers = sorted([i for i in range(n) if d[i] > 0], key=lambda i: d[i], reverse=True)
    donors = sorted([i for i in range(n) if s[i] > 0], key=lambda i: s[i], reverse=True)
    for donor in donors:
        for recv in receivers:
            if recv == donor or d[recv] <= 0 or s[donor] <= 0:
                continue
            t = min(s[donor], d[recv])
            if t <= 0:
                continue
            rec[recv] += t
            giv[donor] += t
            s[donor] -= t
            d[recv] -= t
    return rec, giv, s, d


def p2p_lp(surplus, need, hour, alpha=ALPHA):
    n = len(surplus)
    s, d = surplus[:], [min(x, MAX_HOUSEHOLD_DRAW_KW) for x in need]
    total_s, total_d = sum(s), sum(d)
    if total_s == 0 or total_d == 0:
        rec, giv, rs, rd = p2p_greedy(surplus, need)
        return rec, giv, rs, rd, False
    benefit = max(0.01, grid_price(hour) - SHARED_PRICE)
    prob = pulp.LpProblem("SKB_P2P", pulp.LpMaximize)
    x = pulp.LpVariable.dicts("x", ((i, j) for i in range(n) for j in range(n) if i != j), lowBound=0)
    prob += pulp.lpSum(x[i, j] * benefit for i in range(n) for j in range(n) if i != j)
    for i in range(n):
        prob += pulp.lpSum(x[i, j] for j in range(n) if i != j) <= s[i]
    for j in range(n):
        prob += pulp.lpSum(x[i, j] for i in range(n) if i != j) <= d[j]
    if total_s >= alpha * total_d:
        for j in range(n):
            if d[j] > 0:
                prob += pulp.lpSum(x[i, j] for i in range(n) if i != j) >= alpha * d[j]
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    if pulp.LpStatus[prob.status] != "Optimal":
        rec, giv, rs, rd = p2p_greedy(surplus, need)
        return rec, giv, rs, rd, False
    rec, giv = [0.0] * n, [0.0] * n
    for i in range(n):
        for j in range(n):
            if i != j and x[i, j].value():
                v = x[i, j].value()
                rec[j] += v
                giv[i] += v
    rs = [max(0.0, s[i] - giv[i]) for i in range(n)]
    rd = [max(0.0, d[j] - rec[j]) for j in range(n)]
    return rec, giv, rs, rd, True


def allocate_hour(surplus, need, battery_soc, hour, algo):
    if algo == "Greedy":
        rec, giv, rs, rd = p2p_greedy(surplus, need)
    elif algo == "LP":
        rec, giv, rs, rd, _ = p2p_lp(surplus, need, hour)
    else:
        rec, giv, rs, rd, _ = p2p_lp(surplus, need, hour)
        rec2, giv2, rs, rd = p2p_greedy(rs, rd)
        rec = [rec[i] + rec2[i] for i in range(len(rec))]
        giv = [giv[i] + giv2[i] for i in range(len(giv))]
    rem_need, rem_sur = sum(rd), sum(rs)
    grid_draw, new_soc, discharge = battery_dispatch(rem_need, rem_sur, battery_soc, hour)
    price = grid_price(hour)
    sharing_save = sum(rec) * max(0.0, price - SHARED_PRICE)
    battery_save = discharge * max(0.0, price - SHARED_PRICE) if price >= GRID_PRICE_PEAK else 0.0
    return {"received": rec, "grid_draw": grid_draw, "battery_soc": new_soc, "savings": sharing_save + battery_save}


def run_scenario(num_households, algo, seed):
    loads, _ = generate_load_profiles(num_households, seed)
    battery_soc = 0.50
    received_total = [0.0] * num_households
    total_savings = total_grid = baseline_grid = 0.0
    t0 = time.perf_counter()
    for day in range(DAYS_TO_SIMULATE):
        irr = sample_irradiance(seed * 1000 + day)
        solar = generate_solar_profiles(irr, num_households, seed + day)
        for hour in range(24):
            price = grid_price(hour)
            surplus, need = [], []
            for h in range(num_households):
                load, gen = loads[h][hour], solar[h][hour]
                surplus.append(max(0.0, gen - load))
                need.append(max(0.0, load - gen))
                baseline_grid += max(0.0, load - gen) * price
            out = allocate_hour(surplus, need, battery_soc, hour, algo)
            battery_soc = out["battery_soc"]
            total_savings += out["savings"]
            total_grid += out["grid_draw"] * price
            for i, v in enumerate(out["received"]):
                received_total[i] += v
    grid_reduction = (1 - total_grid / baseline_grid) * 100 if baseline_grid > 0 else 0.0
    monthly_savings = total_savings / DAYS_TO_SIMULATE * 30
    return {
        "savings": total_savings,
        "monthly_savings": monthly_savings,
        "grid_reduction": grid_reduction,
        "gini": gini(received_total),
        "time_sec": time.perf_counter() - t0,
    }


def run_multi(num_households, num_runs):
    algos = ["Greedy", "LP", "Hybrid"]
    buckets = {a: [] for a in algos}
    print(f"  {num_households} HH × {num_runs} runs...", end=" ", flush=True)
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


def topsis_scores(results_by_scale):
    algos = ["Greedy", "LP", "Hybrid"]
    scale_scores = {a: [] for a in algos}
    scale_winners = {}
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
        ideal_best, ideal_worst = weighted.max(axis=0), weighted.min(axis=0)
        d_best = np.sqrt(((weighted - ideal_best) ** 2).sum(axis=1))
        d_worst = np.sqrt(((weighted - ideal_worst) ** 2).sum(axis=1))
        scores = d_worst / (d_best + d_worst + 1e-12)
        for i, a in enumerate(algos):
            scale_scores[a].append(scores[i])
        scale_winners[scale] = algos[int(np.argmax(scores))]
    avg = {a: float(np.mean(scale_scores[a])) for a in algos}
    return max(avg, key=avg.get), avg, scale_scores, scale_winners


def print_results(results_by_scale):
    print("\n" + "=" * 88)
    print("RESULTS — 50 & 100 HOUSEHOLDS (mean ± std)")
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
        print(f"  Suggested hardware: {HW_BY_SCALE.get(scale, 'See TOPSIS winner')}")


def plot_results(results_by_scale, scale_scores):
    scales = list(results_by_scale.keys())
    algos = ["Greedy", "LP", "Hybrid"]
    colors = ["#F5A623", "#2E5A4C", "#E86A2C"]
    fig, axes = plt.subplots(2, 2, figsize=(12, 9))
    for i, algo in enumerate(algos):
        axes[0, 0].plot(scales, [results_by_scale[s][algo]["monthly_savings_mean"] for s in scales], "o-", color=colors[i], label=algo, lw=2)
        axes[0, 1].plot(scales, [results_by_scale[s][algo]["gini_mean"] for s in scales], "s-", color=colors[i], label=algo, lw=2)
        axes[1, 0].plot(scales, [results_by_scale[s][algo]["grid_reduction_mean"] for s in scales], "D-", color=colors[i], label=algo, lw=2)
        axes[1, 1].plot(scales, scale_scores[algo], "p-", color=colors[i], label=algo, lw=2)
    axes[0, 0].set(title="Monthly Savings (₱)", xlabel="Households")
    axes[0, 1].set(title="Gini (lower = fairer)", xlabel="Households")
    axes[0, 1].axhline(0.4, color="red", ls="--", alpha=0.5)
    axes[1, 0].set(title="Grid Reduction vs Baseline (%)", xlabel="Households")
    axes[1, 1].set(title="TOPSIS Score", xlabel="Scale (50 → 100)")
    for ax in axes.flat:
        ax.legend()
        ax.grid(alpha=0.3)
    plt.suptitle("SolarKapitBahay — 50 vs 100 Households", fontweight="bold")
    plt.tight_layout()
    plt.savefig(OUTPUT_PNG, dpi=150, bbox_inches="tight")
    plt.show()


def export_csv(results_by_scale, scale_scores):
    rows = []
    scales = list(results_by_scale.keys())
    for scale, res in results_by_scale.items():
        for algo in ["Greedy", "LP", "Hybrid"]:
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
                "topsis_score": scale_scores[algo][scales.index(scale)],
            })
    df = pd.DataFrame(rows)
    df.to_csv(OUTPUT_CSV, index=False)
    return df


# =============================================================================
# MAIN
# =============================================================================
print("=" * 88)
print("SOLARKAPITBAHAY — 50 & 100 Household Algorithm Comparison")
print("=" * 88)
print(f"Scales: {HOUSEHOLD_SCALES} | Days: {DAYS_TO_SIMULATE} | Runs: {NUM_RUNS}")
print(f"Battery: {BATTERY_CAPACITY_KWH} kWh | Shared: ₱{SHARED_PRICE}/kWh | α={ALPHA}")

results_by_scale = {n: run_multi(n, NUM_RUNS) for n in HOUSEHOLD_SCALES}
print_results(results_by_scale)

winner, avg_topsis, scale_scores, scale_winners = topsis_scores(results_by_scale)
print("\n" + "=" * 88)
print("TOPSIS RESULTS")
print("=" * 88)
for scale in HOUSEHOLD_SCALES:
    w = scale_winners[scale]
    r = results_by_scale[scale][w]
    print(f"  {scale} HH → Winner: {w}  |  Monthly ₱{r['monthly_savings_mean']:.0f}  |  Payback {r['payback_months']:.1f} mo")
print(f"\n  Overall winner (avg TOPSIS): {winner}")
for a in ["Greedy", "LP", "Hybrid"]:
    print(f"    {a}: {avg_topsis[a]:.4f}")

export_csv(results_by_scale, scale_scores)
plot_results(results_by_scale, scale_scores)
print(f"\nSaved: {OUTPUT_CSV}, {OUTPUT_PNG}")
print("Done.")
