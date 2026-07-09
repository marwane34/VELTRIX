# ESP32 Sensor Wiring Guide

## Components Required
- ESP32 DevKit v1
- MPU6050 (6-axis IMU) — vibration
- DS18B20 (waterproof) — temperature
- ACS712-30A — current sensor
- Hall Effect sensor (SS49E or KY-003) — RPM

## Wiring

### MPU6050 (I2C)
| MPU6050 | ESP32 |
|---------|-------|
| VCC     | 3.3V  |
| GND     | GND   |
| SDA     | GPIO 21 |
| SCL     | GPIO 22 |
| AD0     | GND (I2C addr 0x68) |
| INT     | (optional) GPIO 23 |

### DS18B20 (1-Wire)
| DS18B20 | ESP32       |
|---------|-------------|
| VCC     | 3.3V        |
| GND     | GND         |
| DATA    | GPIO 4      |
|         | 4.7kΩ pull-up between DATA and VCC |

### ACS712-30A (Analog Current)
| ACS712  | ESP32       |
|---------|-------------|
| VCC     | 5V (from USB, or regulated) |
| GND     | GND         |
| OUT     | GPIO 34 (ADC1, input-only) |

Note: ACS712 variants:
- ACS712-05A: 185 mV/A
- ACS712-20A: 100 mV/A
- ACS712-30A: 66 mV/A (used in firmware)

### Hall Effect Sensor (RPM)
| Hall Sensor | ESP32      |
|-------------|------------|
| VCC         | 3.3V       |
| GND         | GND        |
| OUT         | GPIO 35 (input-only, with interrupt) |

Mount one small neodymium magnet on rotating shaft.
1 pulse per revolution → direct RPM calculation.

## Power Budget
| Component | Current |
|-----------|---------|
| ESP32     | ~240mA peak |
| MPU6050   | ~3.9mA |
| DS18B20   | ~1.5mA |
| ACS712    | ~10mA  |
| Hall      | ~10mA  |
| **Total** | ~265mA |

Use a 5V/1A USB supply or LiPo + TP4056 charging circuit.
