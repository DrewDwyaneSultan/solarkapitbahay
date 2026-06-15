# Real solar / load readings (replace simulated values)

Today the ESP32 uses **random numbers** in `publishTelemetry()`:

```cpp
lastSolarW = 120.0f + (random(0, 800) / 10.0f);  // fake
lastLoadW  = 60.0f + (random(0, 400) / 10.0f);   // fake
```

To show **actual watts**, you need **sensors** + a small code change. MQTT topics and the LCD format stay the same.

---

## Recommended for your project: INA219 (I2C)

**INA219** module measures **voltage (V)** and **current (A)** on a DC line. Power in watts:

```
W = V × A
```

| Reading | Where to wire INA219 |
|---------|----------------------|
| **Solar (S)** | In series on **DC from panel** (before charge controller) or on controller **solar input** side |
| **Load (L)** | In series on **DC to loads** (after battery/controller “load” output) |

**Per house:** 2× INA219 (solar + load) — same idea for ESP32_A1 and ESP32_B2.

### I2C addresses (share bus with LCD)

| Device | Typical address |
|--------|-----------------|
| LCD backpack | **0x27** (yours) |
| INA219 #1 (solar) | **0x40** (default; ADDR pin to GND) |
| INA219 #2 (load) | **0x41** (ADDR pin to VCC) or second module with different ADDR |

Run `I2C_Scanner` after wiring — you should see **0x27**, **0x40**, **0x41**.

### Wiring to ESP32 (same bus as LCD)

```
LCD + INA219s:
  SDA → D21
  SCL → D22
  GND → common GND
  VCC → 3.3V or 5V per module datasheet (INA219 logic is 3.3V OK)
```

**High-side vs low-side:** Follow module guide — usually **high-side** on the + wire of the circuit you measure (panel + or load +), with **GND** of INA219 to circuit ground.

### Arduino library

**Library Manager:** install **Adafruit INA219** (and **Adafruit BusIO** if prompted).

---

## Code change (concept)

1. Add at top of A1/B2 sketch:

```cpp
#include <Adafruit_INA219.h>
Adafruit_INA219 inaSolar(0x40);
Adafruit_INA219 inaLoad(0x41);

#define USE_REAL_SENSORS 1   // 0 = keep random demo
```

2. In `setup()`, after `Wire.begin(21, 22)`:

```cpp
#if USE_REAL_SENSORS
  if (!inaSolar.begin() || !inaLoad.begin()) {
    lcdShow("Sensor ERR", "check I2C");
    while (1) delay(1000);
  }
#endif
```

3. Replace fake lines in `publishTelemetry()`:

```cpp
#if USE_REAL_SENSORS
  lastSolarW = inaSolar.getPower_mW() / 1000.0f;   // mW → W
  lastLoadW  = inaLoad.getPower_mW() / 1000.0f;
  if (lastSolarW < 0) lastSolarW = 0;
  if (lastLoadW < 0) lastLoadW = 0;
#else
  lastSolarW = 120.0f + (random(0, 800) / 10.0f);
  lastLoadW  = 60.0f + (random(0, 400) / 10.0f);
#endif
```

4. **Battery %** still needs a source (see below).

---

## Battery % (not from INA219 alone)

Pick one:

| Method | Notes |
|--------|--------|
| **BMS / battery monitor** with serial or analog tap | Best if you have one |
| **Voltage divider** on battery → ESP32 ADC | Rough % from voltage curve (LiFePO4 vs lead-acid differs) |
| **Keep simulated** for capstone demo | OK until real BMS exists |

---

## Other hardware options

| Sensor | Good for | Notes |
|--------|----------|--------|
| **PZEM-004T** | AC mains load | UART, 220V — not for small DC panel only |
| **ACS712** | Current only | Need separate voltage; less accurate |
| **MPPT / inverter Modbus** | Whole system | If school provides gear with RS485 |

---

## Safety (important)

- INA219 is for **low DC** (module rating, often 26 V / 3 A — check your module).
- Do **not** put INA219 on **220 V AC** without proper meters.
- Common **GND** between ESP32, INA219, and solar controller ground.
- When in doubt, ask your adviser where to break the circuit (panel vs controller vs load).

---

## Bring-up order

1. Wire **one** INA219 on solar line only → Serial print `getPower_mW()` every second.
2. Add second INA219 for load.
3. Enable `USE_REAL_SENSORS` in A1, upload, check MQTT `solar_w` / `load_w` vs multimeter.
4. Copy setup to B2 on second house.

---

## Web app

The React app still uses **mock data** until `backend/` subscribes to MQTT. Real sensors fix **hardware truth** first; backend bridge is a separate sprint.

---

## What to tell us next

Reply with:

1. **DC or AC?** (panel voltage, controller model if any)
2. **Do you have INA219 modules (or budget to buy)?**
3. **One panel per house or shared?**

Then we can add the exact `readSensors()` code to A1/B2 in the repo.
