/*
 * ESP32 Predictive Maintenance Sensor Node
 * HTTP POST mode — sends sensor data to Supabase REST API
 *
 * Sensors:
 *   - MPU6050  → Vibration (3-axis accelerometer)
 *   - DS18B20  → Temperature
 *   - ACS712   → Current (analog)
 *   - Hall sensor → RPM
 *
 * Wire:
 *   MPU6050  SDA → GPIO 21, SCL → GPIO 22
 *   DS18B20  DATA → GPIO 4 (with 4.7kΩ pull-up to 3.3V)
 *   ACS712   OUT → GPIO 34 (ADC)
 *   Hall sensor → GPIO 35 (interrupt)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ── Configuration ─────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MACHINE_ID    = "M1";

// Supabase REST endpoint — replace <project-ref> with your Supabase project ref
const char* SUPABASE_URL      = "https://<project-ref>.supabase.co/rest/v1/sensor_snapshots";
const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const char* MACHINE_UUID      = "YOUR_MACHINE_UUID_FROM_DB";  // UUID from machines table

// Upload interval (ms)
const unsigned long UPLOAD_INTERVAL = 5000;

// ── Hardware pins ─────────────────────────────────────────────────────────────
#define ONE_WIRE_BUS  4
#define ACS712_PIN    34
#define HALL_PIN      35

// ── Globals ───────────────────────────────────────────────────────────────────
MPU6050 mpu;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

volatile uint32_t pulseCount = 0;
unsigned long lastUpload     = 0;
unsigned long lastRPMCalc    = 0;
float currentRPM             = 0;

void IRAM_ATTR hallISR() { pulseCount++; }

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // MPU6050
  Wire.begin(21, 22);
  mpu.initialize();
  if (!mpu.testConnection()) Serial.println("[WARN] MPU6050 not found");

  // DS18B20
  sensors.begin();

  // Hall sensor (RPM)
  pinMode(HALL_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(HALL_PIN), hallISR, FALLING);

  // WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
}

// ── Sensor read helpers ───────────────────────────────────────────────────────
float readTemperature() {
  sensors.requestTemperatures();
  float t = sensors.getTempCByIndex(0);
  return (t == DEVICE_DISCONNECTED_C) ? 0.0f : t;
}

float readCurrent() {
  // ACS712-30A: sensitivity = 66 mV/A, offset = VCC/2
  int raw = analogRead(ACS712_PIN);
  float voltage = raw * (3.3f / 4095.0f);
  float current = (voltage - 1.65f) / 0.066f;  // Adjust for your ACS712 variant
  return fabs(current);
}

float readVibrationRMS() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  // Convert raw → g (±2g range: 16384 LSB/g)
  float x = ax / 16384.0f;
  float y = ay / 16384.0f;
  float z = az / 16384.0f;
  return sqrt((x*x + y*y + z*z) / 3.0f);
}

float calcRPM() {
  unsigned long now = millis();
  unsigned long dt  = now - lastRPMCalc;
  if (dt < 200) return currentRPM;
  noInterrupts();
  uint32_t pulses = pulseCount;
  pulseCount = 0;
  interrupts();
  lastRPMCalc = now;
  // Assuming 1 magnet on shaft → 1 pulse per revolution
  currentRPM = (pulses / (dt / 1000.0f)) * 60.0f;
  return currentRPM;
}

// ── Upload ────────────────────────────────────────────────────────────────────
void uploadData(float temp, float rms, float curr, float rpm) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARN] WiFi disconnected — skipping upload");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["machine_id"]     = MACHINE_UUID;
  doc["temperature"]    = round(temp * 10) / 10.0;
  doc["vibration_rms"]  = round(rms * 1000) / 1000.0;
  doc["current"]        = round(curr * 100) / 100.0;
  doc["rpm"]            = (int)rpm;
  doc["voltage"]        = 220;  // Or read from a voltage sensor

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(SUPABASE_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");

  int code = http.POST(body);
  Serial.printf("[HTTP] POST %d | T=%.1f°C V=%.3fg I=%.2fA RPM=%.0f\n",
                code, temp, rms, curr, rpm);
  http.end();
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  float rpm  = calcRPM();
  unsigned long now = millis();
  if (now - lastUpload >= UPLOAD_INTERVAL) {
    lastUpload = now;
    float temp = readTemperature();
    float rms  = readVibrationRMS();
    float curr = readCurrent();
    uploadData(temp, rms, curr, rpm);
  }
}
