# Circuit architecture (your lab build)

This matches your step-by-step wiring document and the firmware layout in this repo.

---

## Two ESP32 roles

| Board | Sketch folder | Job |
|-------|---------------|-----|
| **ESP32 #1** | `SolarKapitBahay_ESP32_Controller/` | Read solar **V** + **I**, **Greedy**, **relays**, **MQTT publish** |
| **ESP32 #2** | `SolarKapitBahay_ESP32_DisplayHub/` | **MQTT subscribe**, update **two I2C LCDs** |

The older `ESP32_A1` / `ESP32_B2` sketches (each house publishes its own fake telemetry) were for the **two-board + two-LCD** demo before this unified circuit. Use **Controller + DisplayHub** for your current wiring.

---

## Pin map (ESP32 #1 — controller)

| Your doc | ESP32 pin | GPIO | Firmware |
|----------|-----------|------|----------|
| ACS712 OUT | **D34** | 34 | `PIN_ACS712_SOLAR` |
| Voltage S/OUT | **D35** | 35 | `PIN_VOLTAGE` |
| Relay IN1 (House A) | **D26** | 26 | `RELAY_PIN_HOUSE_A` |
| Relay IN2 (House B) | **D27** | 27 | `RELAY_PIN_HOUSE_B` |
| ACS712 VCC, Relay VCC | **VIN** | — | 5 V from USB |
| All GND | breadboard GND | — | common rail |

**Important:** Earlier drafts used D34 = voltage and D35 = current. Your document uses the **opposite** — firmware for Controller is fixed to **D34 = current, D35 = voltage**.

---

## Pin map (ESP32 #2 — display hub)

| LCD | SDA | SCL | I2C address |
|-----|-----|-----|-------------|
| House A LCD | D21 | D22 | **0x27** (scan to confirm) |
| House B LCD | D21 | D22 | **0x3F** (or second address from scanner) |

Both LCDs share one I2C bus; addresses must differ.

---

## Power & safety (from your doc)

- **Only USB** powers ESP32 — do **not** connect solar panel to ESP32 pins.
- Solar **+** flows: Panel → ACS712 IP+ → IP− → voltage divider → end (measured branch).
- Solar **−** → GND rail only.
- Relay switches **battery → LED** (demo loads), not the solar line.
- **100 Ω** resistor before each LED long leg.

---

## Greedy (ESP32 #1)

Every **2 s** (configurable `LOOP_MS`):

| Solar watts | House A relay | House B relay |
|-------------|---------------|---------------|
| ≥ `WATTS_BOTH_HOUSES` (default 4 W) | ON | ON |
| ≥ `WATTS_HOUSE_A_ONLY` (default 1.5 W) | ON | OFF |
| Below threshold | OFF | OFF |

Tune thresholds in `SolarKapitBahay_ESP32_Controller.ino` after you measure real panel output (shade / lamp test).

Relay: **LOW = ON** (`RELAY_ACTIVE_LOW`).

---

## MQTT topics

| Topic | Direction | Payload |
|-------|-----------|---------|
| `solarkapitbahay/controller/telemetry` | ESP32 #1 → broker | `solar_v`, `solar_a`, `solar_w`, `house_a`, `house_b` |
| `solarkapitbahay/controller/status` | ESP32 #1 | `online` / `offline` |

**MQTT Explorer:** subscribe to `solarkapitbahay/#`

**Display hub** subscribes only to `controller/telemetry`.

---

## Bring-up order

1. Wire per Steps 1–9 (common GND rail).
2. Upload **Controller** → Serial Monitor: `V`, `solar_w`, relay states.
3. Cover / uncover panel → LEDs follow Greedy.
4. PC: Mosquitto + `ipconfig` → set `MQTT_SERVER` in both sketches.
5. Run **I2C_Scanner** on ESP32 #2 → set `LCD_ADDR_A` / `LCD_ADDR_B`.
6. Upload **DisplayHub** → both LCDs update when #1 publishes.

---

## ACS712 on 5 V (your wiring)

Controller sensor header uses **~2.5 V** zero offset when ACS712 VCC is on **VIN (5 V)**. Calibrate at **0 A** (panel disconnected or dark).

5 A module → `ACS712_MV_PER_A 185.0f` (default in Controller header).

---

## Web app / Python

The React app and `backend/` Greedy simulation are still **separate** from this hardware path until a backend MQTT bridge is built. Hardware truth is **Controller → Mosquitto → DisplayHub / Explorer**.
