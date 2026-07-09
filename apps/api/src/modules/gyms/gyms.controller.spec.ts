import { Test, TestingModule } from '@nestjs/testing';
import { GymsController } from './gyms.controller';

describe('GymsController', () => {
  let controller: GymsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GymsController],
    }).compile();

    controller = module.get<GymsController>(GymsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
