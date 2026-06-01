# LCD setup — resume here (checkpoint)

Saved so you can quit and continue tomorrow. All sketches and docs are in this repo folder.

## Where we stopped

- **Shield PWR LED still OFF** → LCD is not getting real **5 V on VDD + GND** yet.
- ESP32 has **3V3** (logic only). LCD **VDD** and **BLA** need **~5 V**, not 3.3 V.
- Many ESP32 DevKit boards **do not output 5 V on VIN** when USB-powered — may need **5V/VU pin** or **second 5 V supply** with **common GND**.

## Your shield pin header (from photo)

`GND, VDD, VO, RS, RW, E, D0–D7, BLA, BLK`

| Shield | Connect to |
|--------|------------|
| GND, BLK | ESP32 GND (common ground) |
| VDD, BLA | **5 V** (not 3V3) |
| VO | leave empty (on-board contrast pot) |
| RW | GND |
| RS | GPIO 2 (D2) |
| E | GPIO 4 (D4) |
| D4–D7 | GPIO 5, 15, 16, 17 |
| D0–D3 | not used (4-bit mode) |

## Tomorrow — do this first (no code)

1. **Multimeter:** VDD → GND on shield = **~5 V**?
2. If not 5 V: wire VDD/BLA to **5V or VU** on ESP32, or **USB/charger 5 V** on breadboard + **jumper breadboard rails** if split.
3. **Common GND:** ESP32 GND + shield GND + BLK + supply GND.
4. **Minimum test:** only GND, VDD, BLA, BLK → **PWR LED on shield must light**.
5. Then upload `LCD_Pin_Test/LCD_Pin_Test.ino`, turn blue trim pot for **HELLO**.

## Files to use

| File | Purpose |
|------|---------|
| `LCD_Pin_Test/LCD_Pin_Test.ino` | LCD only — upload first after power works |
| `SolarKapitBahay_ESP32_A1/...ino` | House A + MQTT (after LCD works) |
| `SolarKapitBahay_ESP32_B2/...ino` | House B + MQTT |
| `LCD_Keypad_Shield_Wiring.md` | Full wiring + PWR troubleshooting |

## Code pin map (already set)

```cpp
LiquidCrystal lcd(2, 4, 5, 15, 16, 17);  // RS, EN, D4-D7
#define LCD_BL -1   // Bla->5V, Blk->GND (no GPIO)
```

## MQTT (when LCD works)

- Broker PC IP: `192.168.55.114` (re-check with `ipconfig` if Wi‑Fi changes)
- Mosquitto on port 1883
- Sketches A1/B2 already have Wi‑Fi placeholders or your team’s SSID

## Do not confuse

| Light | What it is |
|-------|------------|
| ESP32 blue LED (D2) | GPIO 2 / RS — **not** LCD |
| Shield **PWR** | LCD has 5 V on VDD |
| LCD glow behind glass | BLA + BLK wired to 5 V + GND |

## Optional: back up on GitHub

When ready: `git add firmware/esp32` and commit (only if you want remote backup).

---

*Checkpoint written when pausing LCD hardware troubleshooting.*
