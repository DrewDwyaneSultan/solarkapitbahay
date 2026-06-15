/*
 * Find which GPIO sees your sensors — LCD optional, Serial only.
 *
 * 1. Upload this sketch (no LCD needed).
 * 2. Serial Monitor 115200
 * 3. Touch ACS712 OUT wire to each test pin OR note which number changes
 *    when you shade/brighten the LED.
 *
 * Only use GPIO 32,33,34,35,36,39 for analog on ESP32.
 */

void setup() {
  Serial.begin(115200);
  delay(1500);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  Serial.println();
  Serial.println("=== ADC Pin Finder ===");
  Serial.println("Shade/brighten LED — watch which GPIO value changes.");
  Serial.println();
}

const int pins[] = {32, 33, 34, 35, 36, 39};
const char* names[] = {"D32", "D33", "D34", "D35", "D36", "D39"};

void loop() {
  Serial.println("---");
  for (unsigned i = 0; i < 6; i++) {
    int raw = analogRead(pins[i]);
    float v = raw * (3.3f / 4095.0f);
    Serial.print(names[i]);
    Serial.print(" (GPIO ");
    Serial.print(pins[i]);
    Serial.print(") raw=");
    Serial.print(raw);
    Serial.print("  V=");
    Serial.println(v, 3);
  }
  delay(800);
}
