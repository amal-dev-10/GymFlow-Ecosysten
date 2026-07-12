export interface NormalizedDeviceEvent {
  type: 'CHECK_IN' | 'CHECK_OUT' | 'VERIFY_SUCCESS' | 'VERIFY_FAILED' | 'DOOR_OPEN';
  externalUserId?: string;
  timestamp: Date;
  rawPayload: any;
}

export interface DeviceVendorAdapter {
  normalizeEvent(payload: any): NormalizedDeviceEvent;
}
