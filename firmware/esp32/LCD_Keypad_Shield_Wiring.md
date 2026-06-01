# 1602 LCD Keypad Shield — ESP32 wiring

This shield is **not I2C**. It uses many digital wires (HD44780 parallel mode).

## Your team wiring (SolarKapitBahay)

| LCD signal | Connected to ESP32 pin |
|------------|-------------------------|
| RS | **D2** (GPIO 2) |
| EN | **D4** (GPIO 4) |
| D4 | **D5** (GPIO 5) |
| D5 | **D15** (GPIO 15) |
| D6 | **D16** (GPIO 16) |
| D7 | **D17** (GPIO 17) |
| **Bla** | Backlight **+** (anode) → **5V** or **GPIO 18** |
| **Blk** | Backlight **−** (cathode) → **GND** |

In code: `LiquidCrystal lcd(2, 4, 5, 15, 16, 17);`

## Shield pins you have (D4–D7 + Bla / Blk)

Many student shields only break out **data lines D4–D7** plus **Bla** and **Blk**. There is **no D10 pin** on that header — that is normal.

| Pin on shield | Meaning | Connect to ESP32 |
|---------------|---------|------------------|
| **RS** | Register select | GPIO **2** (your team map) |
| **EN** | Enable | GPIO **4** |
| **D4–D7** | 4-bit data | GPIO **5, 15, 16, 17** |
| **Bla** | Backlight LED **+** | **5V** *or* GPIO **18** (HIGH) |
| **Blk** | Backlight LED **−** | **GND** |
| **VCC / 5V** | LCD logic power | **5V** |
| **GND** | Ground | **GND** |

**Bla / Blk are only the white/yellow glow** behind the glass — not RS, EN, or D4–D7.

### Easiest backlight (always on)

```
Bla  →  ESP32 5V
Blk  →  ESP32 GND
```

Set `#define LCD_BL -1` in the sketch (no GPIO needed).

### Backlight from code (optional)

```
Bla  →  GPIO 18
Blk  →  GND
```

Sketch uses `#define LCD_BL 18` and `digitalWrite(18, HIGH)` in `setup()`.

## Backlight vs contrast

| Control | What it does |
|---------|----------------|
| **Blue trim pot** (on PCB, not always on pin header) | Character contrast only — **not** backlight |
| **Bla + Blk** | Backlight on/off (glow behind glass) |
| **ESP32 blue LED** | On-board LED — **not** the LCD |

**Power:** **VDD → 5V**, **GND → GND**. Without **Bla/Blk** wired, the display can stay dark even if code and data pins are correct.

---

## Shield PWR LED still off (no power on VDD)

The small **PWR** LED on the keypad shield only means: **current flows from VDD → GND through the board**. Code cannot turn it on. If it stays off, fix power before uploading again.

### Step 1 — Do not use 3V3 for VDD

| ESP32 pin | Use for LCD VDD? |
|-----------|------------------|
| **3V3** | **Never** — too low; PWR LED usually stays off |
| **VIN** | **Maybe** — see Step 2 (clone-dependent) |
| **5V / VU** (if your board has it) | **Yes** — best when USB powered |
| **USB 5V** (breadboard supply, spare cable) | **Yes** — most reliable |

### Step 2 — Many ESP32 DevKit boards do NOT give 5V on VIN

When powered only by **USB**, some clones:

- Regulate USB → **3.3V** for the chip
- **Do not** expose full 5V on **VIN** (or VIN is input-only)

**Try this order:**

1. Look for a pin labeled **5V** or **VU** near the USB connector → wire **VDD** and **BLA** there.
2. If there is no 5V pin, power the breadboard **5V rail** from:
   - a **second USB cable** (5V + GND only to breadboard), or
   - a **phone charger / 5V adapter** (+) to rail, (−) to **same GND as ESP32**
3. **Common GND is mandatory:** ESP32 GND, LCD GND, Blk, breadboard blue rail — all tied together.

### Step 3 — Breadboard “5V” trap

On many breadboards the **red/blue power rails are split in the middle**. A wire to “5V” on the left rail does **not** reach the shield on the right rail unless you **bridge the gap** with a jumper.

```
[ USB 5V ] ----red rail----+---- jumper across gap ----+---- VDD on shield
                           |                            |
[ GND ]    ----blue rail---+----------------------------+---- GND on shield
```

### Step 4 — Multimeter test (best proof)

With USB plugged in, measure **DC voltage**:

| Between | Should read |
|---------|-------------|
| Shield **VDD** and **GND** | **4.8 – 5.2 V** |
| Shield **BLA** and **BLK** | **4.8 – 5.2 V** (if Bla/Blk wired) |

If you read **0 V** or **~3.3 V** → wrong pin or broken rail. Fix wiring until VDD shows **5 V**.

**Only then** should the shield **PWR** LED turn on.

### Step 5 — Minimum wires for PWR LED test

Disconnect extra wires. Use only:

| Shield | ESP32 / supply |
|--------|----------------|
| **GND** | **GND** |
| **VDD** | **5V source** (see above) |
| **BLK** | **GND** |
| **BLA** | **5V** (same as VDD) |

Upload nothing required. If **PWR** still off with **5 V on VDD** → bad cable, cold solder on shield, or dead board.

### Step 6 — After PWR lights

Add signal wires (RS, E, D4–D7), upload `LCD_Pin_Test.ino`, turn contrast pot.

**RW:** tie to **GND** if the shield does not ground it internally.

## Shield labels (Arduino UNO layout) — reference only

| Shield label | UNO pin | Typical ESP32 GPIO (safe) |
|--------------|---------|---------------------------|
| RS | D8 | **19** |
| EN | D9 | **18** |
| D4 | D4 | **23** |
| D5 | D5 | **17** |
| D6 | D6 | **16** |
| D7 | D7 | **15** |
| BL (backlight) | D10 | **4** |
| KEY (keypad) | A0 | **34** (ADC) |

**Important:** On ESP32-WROOM, avoid GPIO **6, 7, 8, 9, 10, 11** (flash pins).  
If your friends wired RS/EN to 8 and 9, move them or change the sketch to match actual wires.

Power: shield needs **5V** and **GND** from ESP32 (or external 5V, common GND).

## Contrast

Turn the **blue potentiometer** on the shield (under the board) if the screen is blank but lit.

## Software

- Library: **LiquidCrystal** (built-in — do not install LiquidCrystal I2C)
- Sketches: `SolarKapitBahay_ESP32_A1` and `SolarKapitBahay_ESP32_B2`

## Ask your friends

Before upload, confirm: *"Which ESP32 GPIO is on RS, EN, D4, D5, D6, D7?"*  
Edit the `#define LCD_RS` lines in the sketch to match.

## LCD shows blocks?

Wrong pin mapping — fix GPIO defines and re-upload.

## Keypad

Five buttons (SELECT / UP / DOWN / LEFT / RIGHT) share one analog pin.  
Press a button — line 2 should briefly show `Key: U` etc.
