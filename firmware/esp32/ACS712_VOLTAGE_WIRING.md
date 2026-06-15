# Voltage sensor + ACS712 → real S / L on LCD & MQTT

**Formula:** `watts = volts × amps`  
Your ESP32 reads **V** from the voltage module and **I** from the ACS712, then multiplies them (same as in `SolarKapitBahay_Sensors.h`).

---

## Parts you have

| Sensor | Measures | ESP32 connection |
|--------|----------|------------------|
| **ACS712 OUT** | Solar + current | **GPIO 34 (D34)** |
| **Voltage S/OUT** | Solar voltage | **GPIO 35 (D35)** |

Use **GPIO 32–39** only for analog (ADC). Do **not** use 3.3 V on the voltage module’s “25 V” side — that side goes to your **DC circuit only**.

---

## Wiring (one house)

### Voltage sensor

- **VCC** → 3.3 V or 5 V (per module label)
- **GND** → ESP32 GND
- **S (signal)** → **GPIO 34**
- **V+ / V-** (screw terminals) → the **DC bus** you want to monitor (e.g. battery terminals or solar input to controller), **same GND** as ESP32

### ACS712 (solar / panel current)

- **VCC** → **3.3 V** (recommended on ESP32 so zero-current output ≈ 1.65 V)
- **GND** → ESP32 GND
- **OUT** → **GPIO 35**
- **IP+ / IP-** (or screw holes): **solar DC +** goes **through** the chip (break the + wire, series with panel → controller)

### Second ACS712 (load) — optional

- Same as above on **GPIO 32** in the **load +** wire after the controller.

If you only have **one** ACS712, set in `SolarKapitBahay_Sensors.h`:

```cpp
#define PIN_ACS712_LOAD  -1
```

Then **L** on the LCD will stay **0** until you add a second sensor (or move the one ACS712 to the load line for load tests).

---

## Power flow (typical)

```
Panel (+) ── ACS712 (solar) ── charge controller ── battery ── ACS712 (load) ── loads
                │                                      │
                └──────── voltage sensor across battery/bus (+ / -)
```

**S (solar W)** ≈ bus voltage × solar branch current  
**L (load W)** ≈ bus voltage × load branch current  

Voltage sensor should sit on the **same reference** you care about (often **battery bus**).

---

## Enable real readings in code

1. Copy `SolarKapitBahay_Sensors.h` is already in the A1 folder; **copy the same file** into `SolarKapitBahay_ESP32_B2/` (or duplicate when editing B2).
2. In `SolarKapitBahay_Sensors.h` set:

```cpp
#define USE_REAL_SENSORS 1
```

3. Pick ACS712 size — uncomment the right `ACS712_MV_PER_A` line (5 A / 20 A / 30 A).
4. Upload A1 / B2.
5. Open **Serial Monitor 115200** — you should see `V=… Is=… Il=… S=… L=…`.

---

## Calibration (do this once per board)

1. **Zero current:** With **no** current flowing (panel disconnected or at night, load off), upload once — sketch averages ACS712 output at boot for zero offset.
2. **Still drifts?** Edit `ACS712_ZERO_OFFSET_V` (try 1.60–1.70).
3. **Voltage wrong?** Measure real battery V with a multimeter, compare to Serial `V=`. Adjust `VOLTAGE_DIVIDER_RATIO` (try 10.5–11.5).
4. **Current backward?** Set `SOLAR_CURRENT_SIGN` or `LOAD_CURRENT_SIGN` to `-1.0`.
5. **Battery %** in JSON is a **rough** guess from voltage — change `vEmpty` / `vFull` in the `.h` for your battery type.

---

## Safety

- **ACS712** modules are for **low DC** only (check rating, often ≤ 30 V on the IC).
- Never put ACS712 or the Arduino voltage module on **220 V AC mains** without proper meters.
- Common **GND** between ESP32, sensors, and solar controller.

---

## One ACS712 only?

| ACS712 placed on | LCD **S** | LCD **L** |
|------------------|-----------|-----------|
| Solar + wire | Real | 0 (until 2nd sensor) |
| Load + wire | 0 | Real |

For capstone demo you can show **real solar** first, then add the second ACS712 for load.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| S and L always 0 | `USE_REAL_SENSORS` 0? Wrong pins? ACS712 not in series with + wire |
| Random high W | Bad zero offset; recalibrate at 0 A |
| V always ~0 or ~25 | Wrong divider ratio; loose V+ / V- |
| ESP32 resets | Do not send > 3.3 V into GPIO — use 3.3 V on ACS712 VCC |

---

## Next: web app

MQTT payload stays the same (`solar_w`, `load_w`). The website still uses mock data until the backend subscribes to the broker.
