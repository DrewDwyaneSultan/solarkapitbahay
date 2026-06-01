/*
 * LCD-only test — no Wi-Fi / MQTT.
 *
 * IMPORTANT: The small blue TRIM POT is CONTRAST only — it does NOT
 * turn the white/yellow LCD backlight on or off.
 *
 * Backlight: shield Bla (+) and Blk (-) — NOT D4-D7.
 *   Easiest: Bla -> 5V, Blk -> GND (set LCD_BL -1 below).
 *   Or: Bla -> GPIO 18, Blk -> GND (set LCD_BL 18).
 *
 * 1. Wire BL, upload, backlight should glow.
 * 2. Turn contrast pot until you see "HELLO".
 */

#include <LiquidCrystal.h>

#define LCD_RS  2
#define LCD_EN  4
#define LCD_D4  5
#define LCD_D5  15
#define LCD_D6  16
#define LCD_D7  17
#define LCD_BL  -1   // Bla->5V Blk->GND; or Bla->18 and set to 18

LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);

void setup() {
  Serial.begin(115200);
  Serial.println("LCD test starting...");

  if (LCD_BL >= 0) {
    pinMode(LCD_BL, OUTPUT);
    digitalWrite(LCD_BL, HIGH);
    Serial.println("Backlight GPIO HIGH. Wire shield Bla here, Blk to GND.");
  }

  delay(500);
  lcd.begin(16, 2);
  lcd.clear();
  lcd.print("HELLO");
  lcd.setCursor(0, 1);
  lcd.print("1234567890");
  Serial.println("If LCD blank: adjust contrast pot, check RS/EN/D4-D7 wires.");
}

void loop() {
  static unsigned n = 0;
  lcd.setCursor(11, 1);
  lcd.print(n % 10);
  n++;
  delay(500);
}
