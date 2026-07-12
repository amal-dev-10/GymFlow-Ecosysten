import { DeviceVendorAdapter, NormalizedDeviceEvent } from './device-vendor.adapter';

export class ZKTecoAdapter implements DeviceVendorAdapter {
  normalizeEvent(payload: any): NormalizedDeviceEvent {
    // A typical ZKTeco event payload might look like:
    // { "UserPIN": "123", "VerifyType": "1", "Time_second": "1699999999", "Status": "0" }
    
    let type: NormalizedDeviceEvent['type'] = 'CHECK_IN';
    
    // ZK status 0 = normal verification (check-in)
    if (payload.Status === '0') {
      type = 'CHECK_IN';
    } else if (payload.Status === '1') {
      type = 'CHECK_OUT';
    }

    return {
      type,
      externalUserId: payload.UserPIN,
      timestamp: payload.Time_second ? new Date(parseInt(payload.Time_second) * 1000) : new Date(),
      rawPayload: payload,
    };
  }
}
