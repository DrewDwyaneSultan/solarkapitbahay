/*
 * Solar line sensors — matches lab wiring doc:
 *   ACS712 OUT  -> GPIO 34 (D34)
 *   Voltage S   -> GPIO 35 (D35)
 * ACS712 VCC on ESP32 VIN (5V) -> zero current ~2.5V
 */

#ifndef SOLARKAPITBAHAY_SENSORS_H
#define SOLARKAPITBAHAY_SENSORS_H

#ifndef USE_REAL_SENSORS
#define USE_REAL_SENSORS 1
#endif

#define PIN_ACS712_SOLAR  33   // D33 — ACS712 OUT (Pin Finder)
#define PIN_VOLTAGE       32   // D32 — divider S (if D35 pegs at 3.3)
#define PIN_ACS712_LOAD   -1   // not in your circuit

#define ACS712_USE_5V      1    // VCC -> VIN (5V)
#define ACS712_MV_PER_A    185.0f  // 5 A module — change to 100 for 20A, 66 for 30A

#define VOLTAGE_DIVIDER_RATIO  11.0f
#define ADC_VREF               3.3f
#define ADC_MAX                4095.0f

#define SOLAR_CURRENT_SIGN     1.0f

#if ACS712_USE_5V
#define ACS712_ZERO_DEFAULT_V  2.50f
#else
#define ACS712_ZERO_DEFAULT_V  1.65f
#endif

static float s_acsZeroSolar = ACS712_ZERO_DEFAULT_V;

inline float skbAdcVolts(int pin) {
  return (float)analogRead(pin) * (ADC_VREF / ADC_MAX);
}

inline float skbReadSolarVolts() {
  return skbAdcVolts(PIN_VOLTAGE) * VOLTAGE_DIVIDER_RATIO;
}

inline float skbReadSolarAmps() {
  float v = skbAdcVolts(PIN_ACS712_SOLAR);
  float mvPerA = ACS712_MV_PER_A / 1000.0f;
  float amps = ((v - s_acsZeroSolar) / mvPerA) * SOLAR_CURRENT_SIGN;
  return amps < 0.0f ? 0.0f : amps;
}

inline void skbInitSensors() {
#if USE_REAL_SENSORS
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  pinMode(PIN_VOLTAGE, INPUT);
  pinMode(PIN_ACS712_SOLAR, INPUT);
  delay(200);
  float sum = 0;
  for (int i = 0; i < 64; i++) {
    sum += skbAdcVolts(PIN_ACS712_SOLAR);
    delay(5);
  }
  s_acsZeroSolar = sum / 64.0f;
  Serial.print("ACS712 zero V=");
  Serial.println(s_acsZeroSolar, 3);
#endif
}

inline void skbReadSolar(float& volts, float& amps, float& watts) {
#if USE_REAL_SENSORS
  volts = skbReadSolarVolts();
  amps = skbReadSolarAmps();
  watts = volts * amps;
#else
  volts = 12.0f;
  amps = 0.3f + (random(0, 50) / 100.0f);
  watts = volts * amps;
#endif
}

#endif
