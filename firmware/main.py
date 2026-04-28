# ============================================================
# DIPDoc Wearable Band — Main Entry Point
# ESP32 MicroPython | Boot → Sensor Loop → BLE Broadcast
# ============================================================

import time
import machine
from config import SystemConfig, Thresholds
from sensors import SensorHub
from deviation import DeviationEngine
from led_controller import LEDController
from haptic import HapticController
from ble_broadcaster import BLEBroadcaster


def main():
    """
    DIPDoc Wearable Band Main Loop.
    
    Flow:
      1. Boot & initialize all peripherals
      2. Calibrate sensors (clean air baseline)
      3. Main loop (100ms tick):
         a. Read all sensors
         b. Calculate deviation score
         c. Determine status (Normal/Warning/Critical)
         d. Update LED breathing effect
         e. Trigger haptic on status change
         f. Broadcast via BLE every 500ms
      4. Watchdog ensures recovery from hangs
    """

    print("=" * 50)
    print("  DIPDoc Wearable Band")
    print(f"  Firmware: {SystemConfig.FIRMWARE_VERSION}")
    print(f"  Device:   {SystemConfig.DEVICE_ID}")
    print("=" * 50)

    # ── Initialize Peripherals ────────────────────────────
    print("\n[BOOT] Initializing peripherals...")

    sensors = SensorHub()
    deviation = DeviationEngine()
    leds = LEDController()
    haptic = HapticController()
    ble = BLEBroadcaster()

    # ── Startup Animation ─────────────────────────────────
    print("[BOOT] Running startup sequence...")
    leds.startup_sequence()

    # ── Sensor Calibration ────────────────────────────────
    print("[BOOT] Calibrating sensors (keep in clean air)...")
    leds.flash(leds.np[0] if False else (46, 204, 113), times=2)
    sensors.calibrate()
    print("[BOOT] Calibration complete")

    # ── Watchdog Timer ────────────────────────────────────
    wdt = None
    try:
        wdt = machine.WDT(timeout=SystemConfig.WATCHDOG_TIMEOUT_S * 1000)
        print(f"[BOOT] Watchdog armed ({SystemConfig.WATCHDOG_TIMEOUT_S}s)")
    except Exception:
        print("[BOOT] Watchdog not available on this board")

    # ── Main Variables ────────────────────────────────────
    last_status = 'Normal'
    loop_count = 0
    last_haptic_status = 'Normal'

    print("\n[RUN] Entering main loop...\n")

    # ── Main Loop ─────────────────────────────────────────
    while True:
        try:
            loop_start = time.ticks_ms()
            loop_count += 1

            # 1. Read all sensors
            sensor_data = sensors.read_all()

            # 2. Calculate deviation score
            result = deviation.calculate(sensor_data)
            score = result['score']
            status = result['status']

            # 3. Update LED
            leds.set_status(status)
            leds.update()

            # 4. Haptic feedback on status CHANGE (not every tick)
            if status != last_haptic_status:
                if status == 'Warning':
                    print(f"[ALERT] ⚠️  Warning — Deviation: {score}%")
                    haptic.gentle_thrum()
                elif status == 'Critical':
                    print(f"[ALERT] 🚨 CRITICAL — Deviation: {score}%")
                    haptic.double_pulse()
                elif status == 'Normal' and last_haptic_status != 'Normal':
                    print(f"[INFO] ✅ Returning to normal — Deviation: {score}%")

                last_haptic_status = status

            # 5. BLE broadcast (internally throttled to 500ms)
            ble.broadcast(status, sensor_data, result)

            # 6. Periodic logging (every 50 ticks ≈ 5 seconds)
            if loop_count % 50 == 0:
                connected = "Connected" if ble.is_connected() else "Advertising"
                print(
                    f"[TICK {loop_count:>6}] "
                    f"Status: {status:<8} | "
                    f"Score: {score:>3}% | "
                    f"Breath: {sensor_data.get('breath_quality', 0):>3}% | "
                    f"Voice: {sensor_data.get('voice_stress', 0):>3} | "
                    f"Hydration: {sensor_data.get('hydration', 0):>3}% | "
                    f"BLE: {connected}"
                )

            last_status = status

            # 7. Feed watchdog
            if wdt:
                wdt.feed()

            # 8. Maintain loop timing
            elapsed = time.ticks_diff(time.ticks_ms(), loop_start)
            sleep_time = max(0, SystemConfig.MAIN_LOOP_MS - elapsed)
            if sleep_time > 0:
                time.sleep_ms(sleep_time)

        except KeyboardInterrupt:
            print("\n[STOP] Manual stop requested")
            break

        except Exception as e:
            print(f"[ERROR] {e}")
            # Flash red to indicate error
            leds.flash((231, 76, 60), times=5, on_ms=50, off_ms=50)
            time.sleep_ms(1000)

    # ── Cleanup ───────────────────────────────────────────
    print("[SHUTDOWN] Cleaning up...")
    haptic.stop()
    haptic.deinit()
    leds.clear()
    ble.deinit()
    print("[SHUTDOWN] DIPDoc Band stopped.")


# ── Entry Point ───────────────────────────────────────────
if __name__ == '__main__':
    main()
