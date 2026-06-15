# Nothing updates on r34 / r35 / A — recovery steps

## Step 1 — Prove the ESP32 program is running

1. Upload `ADC_Pin_Finder/ADC_Pin_Finder.ino` (no LCD library).
2. Serial Monitor **115200**, press **EN**.
3. You must see **new lines every ~0.8 s** with D32…D39 voltages.

| Result | Next |
|--------|------|
| Serial scrolling | ESP32 + USB OK → Step 2 |
| No Serial / frozen | Wrong **COM port** or wrong board → fix upload |

---

## Step 2 — Find the real sensor pins

With **ACS712 OUT** wire in your hand:

1. Plug OUT into **D34** → note Serial **D34** line — shade/sun LED.
2. If **D34** never changes, try **D32**, **D33**, **D35**, **D36** one at a time.
3. The GPIO that **changes** when LED brightens = use that in `SolarKapitBahay_Solar_LCD.ino`:

```cpp
#define PIN_ACS712  ??   // the one that moved
```

Same for voltage divider **S** wire — try until one GPIO changes (not pegged 3.300 forever).

---

## Step 3 — Minimum wires (isolate problems)

Power **off**. Connect only:

| Item | To |
|------|-----|
| ESP32 USB | Laptop |
| ACS712 VCC | VIN |
| ACS712 GND | GND |
| ACS712 OUT | (test D32–D39 in Step 2) |
| Divider + | solar + after ACS712 |
| Divider − | GND |
| Divider S | (test pin in Step 2) |
| Panel − | GND |
| Panel + | ACS712 → 100Ω → LED → GND |

No relay, no second ESP32, no extra jumpers on D34/D35.

---

## Step 4 — Multimeter (one test)

**Black** on GND, **red** on the ESP32 pin you use for OUT.

- Wire **off** pin → **~0 V**
- OUT connected, LED dark → **~2.5 V** (ACS712 on 5V)
- LED bright → voltage **changes**

---

## Step 5 — Back to LCD sketch

After Pin Finder shows which GPIO works:

1. Edit `SolarKapitBahay_Solar_LCD.ino` pins.
2. Re-upload.
3. Reset in **shade** (EN), then sun.

---

## If every GPIO stays 3.300

- **OUT** may be wired to **5V** by mistake.
- Or ACS712 **damaged**.
- Measure OUT to GND with meter **at the sensor board** (not ESP32).

---

## If only voltage stuck at 3.300

- Divider **S** not on signal pin — **+** must go to solar, **S** to ESP32 only.
