# ============================================================
# DIPDoc Wearable Band — BLE Broadcaster
# GATT server broadcasting health data every 500ms
# ============================================================

import bluetooth
import json
import time
from config import BLEConfig, SystemConfig
from micropython import const

# BLE Event Constants
_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

# Flags
_FLAG_READ = const(0x0002)
_FLAG_NOTIFY = const(0x0010)


class BLEBroadcaster:
    """
    BLE GATT Server for DIPDoc Wearable Band.
    Broadcasts health status and sensor JSON every 500ms.
    
    Service UUID: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
    Characteristics:
      - Status  (notify): localStatus string
      - Data    (notify): Full sensor JSON payload
    """

    def __init__(self):
        self.ble = bluetooth.BLE()
        self.ble.active(True)
        self.ble.irq(self._irq_handler)
        self._connections = set()
        self._connected = False
        self._last_broadcast = 0

        # Register GATT service
        self._register_service()

        # Start advertising
        self._advertise()

        print(f"[BLE] {BLEConfig.DEVICE_NAME} initialized")

    def _register_service(self):
        """Register GATT service with status and data characteristics."""
        SERVICE_UUID = bluetooth.UUID(BLEConfig.SERVICE_UUID)
        CHAR_STATUS = (
            bluetooth.UUID(BLEConfig.CHAR_STATUS_UUID),
            _FLAG_READ | _FLAG_NOTIFY
        )
        CHAR_DATA = (
            bluetooth.UUID(BLEConfig.CHAR_DATA_UUID),
            _FLAG_READ | _FLAG_NOTIFY
        )

        SERVICE = (SERVICE_UUID, (CHAR_STATUS, CHAR_DATA))

        ((self._handle_status, self._handle_data),) = \
            self.ble.gatts_register_services((SERVICE,))

    def _irq_handler(self, event, data):
        """Handle BLE events."""
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _ = data
            self._connections.add(conn_handle)
            self._connected = True
            print(f"[BLE] Central connected: {conn_handle}")
            # Continue advertising for multi-connect
            self._advertise()

        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _ = data
            self._connections.discard(conn_handle)
            self._connected = len(self._connections) > 0
            print(f"[BLE] Central disconnected: {conn_handle}")
            self._advertise()

    def _advertise(self):
        """Start BLE advertising."""
        name = BLEConfig.DEVICE_NAME
        payload = self._build_adv_payload(name)
        self.ble.gap_advertise(
            BLEConfig.ADV_INTERVAL_US,
            adv_data=payload
        )
        print(f"[BLE] Advertising as '{name}'")

    def _build_adv_payload(self, name):
        """Build advertising payload with device name."""
        payload = bytearray()

        # Flags
        payload += bytearray([0x02, 0x01, 0x06])

        # Complete local name
        name_bytes = name.encode('utf-8')
        payload += bytearray([len(name_bytes) + 1, 0x09])
        payload += name_bytes

        return payload

    def broadcast(self, status, sensor_data, deviation_result):
        """
        Broadcast data to all connected centrals.
        Called every 500ms from main loop.
        
        Args:
            status: 'Normal', 'Warning', or 'Critical'
            sensor_data: Raw sensor readings dict
            deviation_result: Deviation engine result dict
        """
        now = time.ticks_ms()
        if time.ticks_diff(now, self._last_broadcast) < BLEConfig.BROADCAST_INTERVAL_MS:
            return

        self._last_broadcast = now

        if not self._connections:
            return

        # Status characteristic
        status_bytes = status.encode('utf-8')
        self.ble.gatts_write(self._handle_status, status_bytes)

        # Data characteristic (compact JSON)
        data_payload = {
            'ts': time.time(),
            'id': SystemConfig.DEVICE_ID,
            'st': status[0],  # 'N', 'W', 'C'
            'ds': deviation_result['score'],
            's': {
                'bq': sensor_data.get('breath_quality', 0),
                'vs': sensor_data.get('voice_stress', 0),
                'hy': sensor_data.get('hydration', 0),
                'gr': sensor_data.get('gas_raw', 0),
                'mr': sensor_data.get('mic_rms', 0),
                'im': sensor_data.get('impedance', 0)
            },
            'ev': {
                'co': sensor_data.get('cough_detected', False),
                'vs': sensor_data.get('voice_strain', False),
                'lh': sensor_data.get('low_hydration', False)
            }
        }

        json_bytes = json.dumps(data_payload).encode('utf-8')
        self.ble.gatts_write(self._handle_data, json_bytes)

        # Notify all connected centrals
        for conn in self._connections:
            try:
                self.ble.gatts_notify(conn, self._handle_status)
                self.ble.gatts_notify(conn, self._handle_data)
            except Exception as e:
                print(f"[BLE] Notify failed for {conn}: {e}")

    def is_connected(self):
        """Check if any central is connected."""
        return self._connected

    def connection_count(self):
        """Get number of connected centrals."""
        return len(self._connections)

    def deinit(self):
        """Clean up BLE."""
        self.ble.active(False)
        print("[BLE] Deactivated")
