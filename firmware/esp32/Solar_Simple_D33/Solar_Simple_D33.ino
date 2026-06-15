/*
 * Solar_Simple_D33 — read D33 (ACS712 OUT) + D32 (divider S)
 *
 * ACS712 VCC -> ESP32 3.3V (NOT VIN)
 * At 0A, OUT should be ~1.65V on meter. If ~2.5V, still on 5V.
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define PIN_I   33
#define PIN_V   32
#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_ADDR 0x27

#define ACS712_MV_PER_A  185.0f   // 5A module

LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);
float zeroI = 1.65f;   // updated at boot if sane

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
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();

  lcd16(0, "Cover panel");
  lcd16(1, "press EN...");
  Serial.println("=== Cover panel (0A), press EN ===");
  while (!Serial.available()) delay(50);
  while (Serial.available()) Serial.read();

  zeroI = adcV(PIN_I);
  Serial.print("Zero OUT on D33 = ");
  Serial.println(zeroI, 3);
  if (zeroI > 2.2f) {
    Serial.println("WARNING: >2.2V -> ACS712 likely still on 5V (VIN). Move VCC to 3.3V.");
  }
}

void loop() {
  float ri = adcV(PIN_I);
  float rv = adcV(PIN_V);
  bool satI = ri >= 3.15f;
  bool satV = rv >= 3.15f;

  float amps = 0;
  if (!satI) {
    amps = (ri - zeroI) / (ACS712_MV_PER_A / 1000.0f);
    if (amps < 0) amps = 0;
  }

  // Only trust voltage if D32 not pegged (tune VOLT_MULT with multimeter later)
  float volts = satV ? 0.0f : rv * 5.0f;
  float watts = volts * amps;

  char l1[17], l2[17];
  if (satV) {
    snprintf(l1, sizeof(l1), "D32 MAXED 3.3V");
    snprintf(l2, sizeof(l2), "fix divider S");
  } else if (satI) {
    snprintf(l1, sizeof(l1), "D33 MAXED 3.3V");
    snprintf(l2, sizeof(l2), "use 3.3V VCC");
  } else {
    snprintf(l1, sizeof(l1), "I:%5.3fA", amps);
    snprintf(l2, sizeof(l2), "P:%5.2fW", watts);
  }

  lcd16(0, l1);
  lcd16(1, l2);

  Serial.print("D33=");
  Serial.print(ri, 3);
  Serial.print(" z=");
  Serial.print(zeroI, 3);
  Serial.print(" D32=");
  Serial.print(rv, 3);
  if (satV) Serial.print(" [FIX D32]");
  if (satI) Serial.print(" [FIX D33]");
  Serial.print(" I=");
  Serial.print(amps, 3);
  Serial.print(" (expect ~0.02-0.2 for LED)");
  Serial.println();

  delay(500);
}
