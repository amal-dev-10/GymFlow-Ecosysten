import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { DeviceEventProcessorService } from './services/device-event-processor.service';
import { DeviceSyncService } from './services/device-sync.service';

@Module({
  imports: [RealtimeModule],
  controllers: [DevicesController],
  providers: [DevicesService, DeviceEventProcessorService, DeviceSyncService],
  exports: [DevicesService],
})
export class DevicesModule {}

