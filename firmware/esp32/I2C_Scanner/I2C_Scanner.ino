/*
 * I2C Scanner — find LCD backpack address (often 0x27 or 0x3F)
 *
 * Wiring: GND, VCC->VIN, SDA->D21, SCL->D22
 *
 * Arduino IDE:
 *   1. Upload this sketch
 *   2. Tools -> Serial Monitor
 *   3. Bottom-right: 115200 baud
 *   4. Press ESP32 EN button if the window is empty
 */

#include <Wire.h>

#define I2C_SDA 21
#define I2C_SCL 22

void runScan() {
  Serial.println();
  Serial.println("=== I2C scan (SDA=21, SCL=22) ===");

  uint8_t count = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("  FOUND at 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      count++;
    }
  }

  if (count == 0) {
    Serial.println("  (no devices found)");
    Serial.println();
    Serial.println("Check:");
    Serial.println("  - SDA -> D21, SCL -> D22 (not swapped)");
    Serial.println("  - GND and VCC wired");
    Serial.println("  - LCD backlight on? (power OK)");
    Serial.println("  - Reseat jumper wires");
    Serial.println();
    Serial.println("Still try LCD test with 0x27, then 0x3F anyway.");
  } else {
    Serial.print("  Total devices: ");
    Serial.println(count);
    Serial.println("  Use that hex in LCD_I2C_ADDR (e.g. 0x27).");
  }
  Serial.println("=== end scan ===");
}

void setup() {
  Serial.begin(115200);
  delay(1500);  // time to open Serial Monitor after upload
  Wire.begin(I2C_SDA, I2C_SCL);

  Serial.println();
  Serial.println("SolarKapitBahay I2C Scanner");
  Serial.println("Open Serial Monitor at 115200 baud.");
  runScan();
}

void loop() {
  delay(5000);
  runScan();
}
