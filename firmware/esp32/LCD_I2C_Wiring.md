# 16x2 LCD with I2C module — ESP32 wiring

Your display uses **4 wires** (I2C backpack), not RS/EN/D4–D7.

## Wiring

| LCD module | ESP32 |
|------------|-------|
| **GND** | **GND** |
| **VCC** | **VIN** (5 V from USB on many boards) |
| **SDA** | **D21** (GPIO 21) |
| **SCL** | **D22** (GPIO 22) |

## Software

1. Install library: **LiquidCrystal I2C** (Frank de Brabander) — *not* built-in LiquidCrystal.
2. Upload `I2C_Scanner/I2C_Scanner.ino` → Serial Monitor **115200** → note address (**0x27** or **0x3F**).
3. Set `LCD_I2C_ADDR` in `LCD_Pin_Test` and A1/B2 sketches.
4. Upload `LCD_Pin_Test/LCD_Pin_Test.ino` → expect **HELLO**.

## White blocks before upload

Power-on blocks are normal until the correct **I2C** sketch runs. Parallel pin sketches will **not** work with SDA/SCL wiring.

## Contrast

I2C modules often have a small pot on the backpack — turn slowly if text is too faint.

## MQTT

After **HELLO** works, upload `SolarKapitBahay_ESP32_A1` then start Mosquitto on the PC.
