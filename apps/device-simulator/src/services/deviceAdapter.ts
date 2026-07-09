import { SimulatorAdapter } from "@/adapters/SimulatorAdapter";
import type { DeviceAdapter } from "@/adapters/DeviceAdapter";

/**
 * Single shared adapter instance used across the app. Swapping the
 * simulator for real hardware (ZKTeco, eSSL, USB, RFID, Face, QR) is a
 * one-line change here - nothing else in the app references
 * `SimulatorAdapter` directly.
 */
export const deviceAdapter: DeviceAdapter = new SimulatorAdapter();
