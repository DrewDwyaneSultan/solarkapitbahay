/*
 * Voltage divider module + ACS712 current sensor → watts (P = V × I)
 * Include from SolarKapitBahay_ESP32_A1.ino / _B2.ino
 *
 * Set USE_REAL_SENSORS to 1 after wiring. Calibrate constants below.
 */

#ifndef SOLARKAPITBAHAY_SENSORS_H
#define SOLARKAPITBAHAY_SENSORS_H

// 0 = random demo (default)   1 = read ADC
#ifndef USE_REAL_SENSORS
#define USE_REAL_SENSORS 0
#endif

// --- Pins — match Controller doc: D34=ACS712, D35=voltage ---
#define PIN_ACS712_SOLAR  34
#define PIN_VOLTAGE       35
#define PIN_ACS712_LOAD   32   // second ACS712 on load path; -1 if not wired yet

// --- ACS712 model (pick ONE) ---
// #define ACS712_MV_PER_A  185.0f   // 5 A module
#define ACS712_MV_PER_A  100.0f   // 20 A module (common)
// #define ACS712_MV_PER_A   66.0f   // 30 A module

// --- Voltage sensor (0–25 V module, divider ratio ~11:1) ---
#define VOLTAGE_DIVIDER_RATIO  11.0f
#define ADC_VREF               3.3f
#define ADC_MAX                4095.0f

// --- Calibration (tune in Serial Monitor) ---
#define ACS712_ZERO_OFFSET_V   1.65f   // ~Vcc/2 at 0 A (use 3.3 V supply on ACS712)
#define SOLAR_CURRENT_SIGN     1.0f    // flip to -1.0 if current reads backward
#define LOAD_CURRENT_SIGN      1.0f

static float s_acsZeroSolar = ACS712_ZERO_OFFSET_V;
static float s_acsZeroLoad  = ACS712_ZERO_OFFSET_V;

inline float skbAdcVolts(int pin) {
  return (float)analogRead(pin) * (ADC_VREF / ADC_MAX);
}

inline float skbReadBusVolts() {
  return skbAdcVolts(PIN_VOLTAGE) * VOLTAGE_DIVIDER_RATIO;
}

inline float skbReadCurrentA(int pin, float zeroV, float sign) {
  if (pin < 0) return 0.0f;
  float v = skbAdcVolts(pin);
  float mvPerA = ACS712_MV_PER_A / 1000.0f;
  float amps = ((v - zeroV) / mvPerA) * sign;
  if (amps < 0.0f) amps = 0.0f;
  return amps;
}

inline void skbInitSensors() {
#if USE_REAL_SENSORS
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  pinMode(PIN_VOLTAGE, INPUT);
  if (PIN_ACS712_SOLAR >= 0) pinMode(PIN_ACS712_SOLAR, INPUT);
  if (PIN_ACS712_LOAD >= 0) pinMode(PIN_ACS712_LOAD, INPUT);

  delay(200);
  float sumS = 0, sumL = 0;
  const int n = 64;
  for (int i = 0; i < n; i++) {
    if (PIN_ACS712_SOLAR >= 0) sumS += skbAdcVolts(PIN_ACS712_SOLAR);
    if (PIN_ACS712_LOAD >= 0) sumL += skbAdcVolts(PIN_ACS712_LOAD);
    delay(5);
  }
  if (PIN_ACS712_SOLAR >= 0) s_acsZeroSolar = sumS / n;
  if (PIN_ACS712_LOAD >= 0) s_acsZeroLoad = sumL / n;

  Serial.print("ACS712 zero solar V=");
  Serial.println(s_acsZeroSolar, 3);
  Serial.print("ACS712 zero load  V=");
  Serial.println(s_acsZeroLoad, 3);
#endif
}

inline void skbReadPower(float& solarW, float& loadW, float& batteryPct) {
#if USE_REAL_SENSORS
  float v = skbReadBusVolts();
  float iSolar = skbReadCurrentA(PIN_ACS712_SOLAR, s_acsZeroSolar, SOLAR_CURRENT_SIGN);
  float iLoad  = skbReadCurrentA(PIN_ACS712_LOAD, s_acsZeroLoad, LOAD_CURRENT_SIGN);

  solarW = v * iSolar;
  loadW  = v * iLoad;

  // Rough battery % from bus voltage (edit for your chemistry / system)
  // Example: 12 V lead-acid ~ 11.0 empty, 12.7 full
  const float vEmpty = 11.0f;
  const float vFull  = 12.7f;
  batteryPct = (v - vEmpty) / (vFull - vEmpty) * 100.0f;
  if (batteryPct < 0.0f) batteryPct = 0.0f;
  if (batteryPct > 100.0f) batteryPct = 100.0f;

  Serial.print("V=");
  Serial.print(v, 2);
  Serial.print(" Is=");
  Serial.print(iSolar, 3);
  Serial.print(" Il=");
  Serial.print(iLoad, 3);
  Serial.print(" S=");
  Serial.print(solarW, 1);
  Serial.print("W L=");
  Serial.print(loadW, 1);
  Serial.println("W");
#else
  solarW = 120.0f + (random(0, 800) / 10.0f);
  loadW  = 60.0f + (random(0, 400) / 10.0f);
  batteryPct = 45.0f + (random(0, 300) / 10.0f);
#endif
}

#endif
