/*
 * 16x2 LCD with I2C backpack (PCF8574) — test only, no Wi-Fi/MQTT.
 *
 * Wiring (your team):
 *   GND -> GND
 *   VCC -> VIN (5V when USB powered — OK if backlight already works)
 *   SDA -> D21 (GPIO 21)
 *   SCL -> D22 (GPIO 22)
 *
 * Library (Arduino Library Manager):
 *   "LiquidCrystal I2C" by Frank de Brabander
 *
 * Step 1: Upload I2C_Scanner.ino — note address (usually 0x27 or 0x3F)
 * Step 2: Set LCD_I2C_ADDR below, upload this sketch
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_I2C_ADDR 0x27   // change to 0x3F if scanner says so

LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

void setup() {
  Serial.begin(115200);
  Serial.println("I2C LCD test...");

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HELLO");
  lcd.setCursor(0, 1);
  lcd.print("1234567890");
  Serial.println("Should show HELLO on LCD.");
}

void loop() {
  static unsigned n = 0;
  lcd.setCursor(11, 1);
  lcd.print(n % 10);
  n++;
  delay(500);
}
