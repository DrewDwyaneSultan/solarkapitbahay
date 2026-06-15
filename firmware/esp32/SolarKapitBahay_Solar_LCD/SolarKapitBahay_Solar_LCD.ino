/*
 * Solar LCD — pins from Pin Finder: D33=ACS712, D32=divider
 * Fixed zero (no boot calib when pin pegged at 3.3V)
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define PIN_ACS712  33
#define PIN_VOLTAGE 32

#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_ADDR 0x27

#define ACS712_ZERO_V    1.65f   // ACS712 VCC on 3.3V (not VIN)
#define ACS712_MV_PER_A  185.0f
#define VOLTAGE_RATIO    5.0f

LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

float adcV(int pin) {
  return analogRead(pin) * (3.3f / 4095.0f);
}

void lcd16(int row, const char* s) {
  char b[17];
  snprintf(b, sizeof(b), "%-16s", s);
  lcd.setCursor(0, row);
  lcd.print(b);
}

void setup() {
  Serial.begin(115200);
  delay(800);
  Serial.println("=== Solar LCD D33/D32 ===");

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd16(0, "ACS712->3.3V");
  lcd16(1, "not VIN");
  delay(2000);
}

void loop() {
  float rawI = adcV(PIN_ACS712);
  float rawV = adcV(PIN_VOLTAGE);
  bool sat = rawI >= 3.2f || rawV >= 3.2f;

  float a = sat ? 0.0f : (rawI - ACS712_ZERO_V) / (ACS712_MV_PER_A / 1000.0f);
  if (a < 0) a = 0;
  float v = rawV * VOLTAGE_RATIO;
  float w = v * a;

  char l1[17], l2[17];
  if (sat) {
    snprintf(l1, sizeof(l1), "ADC saturated");
    snprintf(l2, sizeof(l2), "p33:%4.2f p32:%3.2f", rawI, rawV);
  } else {
    snprintf(l1, sizeof(l1), "V:%4.1f A:%4.2f", v, a);
    snprintf(l2, sizeof(l2), "Solar %4.1f W", w);
  }
  lcd16(0, l1);
  lcd16(1, l2);

  Serial.print("p33=");
  Serial.print(rawI, 3);
  Serial.print(" p32=");
  Serial.print(rawV, 3);
  Serial.print(" A=");
  Serial.print(a, 3);
  Serial.print(" W=");
  Serial.println(w, 2);

  delay(400);
}
