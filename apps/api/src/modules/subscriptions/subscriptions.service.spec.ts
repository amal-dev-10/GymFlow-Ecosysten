import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { DatabaseService } from '../../core/database/database.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)),
  subscriptionPlan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  organizationSubscription: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  organizationUser: {
    findMany: jest.fn(),
  },
  subscriptionInvoice: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  subscriptionPayment: {
    create: jest.fn(),
  },
  subscriptionUsage: {
    createMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: DatabaseService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('should list only active, public plans', async () => {
      mockPrisma.subscriptionPlan.findMany.mockResolvedValue([{ id: 'plan-1', name: 'Starter' }]);

      const result = await service.getPlans();

      expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'ACTIVE', visibility: 'PUBLIC' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('subscribe', () => {
    it('should throw NotFoundException if plan does not exist', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.subscribe('org-1', { planId: 'plan-invalid' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for a paid plan (must use checkout instead)', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'ACTIVE',
        price: 99,
        billingCycle: 'MONTHLY',
        resourceLimits: [],
      });

      await expect(
        service.subscribe('org-1', { planId: 'plan-1' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should activate a free plan directly', async () => {
      const mockPlan = {
        id: 'plan-1',
        status: 'ACTIVE',
        price: 0,
        billingCycle: 'FREE',
        resourceLimits: [{ resourceKey: 'branches', limitType: 'LIMITED', limitValue: 5 }],
      };
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);

      const mockSub = { id: 'sub-1', organizationId: 'org-1', planId: 'plan-1', status: 'Active' };
      mockPrisma.organizationSubscription.create.mockResolvedValue(mockSub);
      mockPrisma.subscriptionInvoice.create.mockResolvedValue({ id: 'inv-1', amount: 0 });

      const result = await service.subscribe('org-1', { planId: 'plan-1' });

      expect(result.subscription).toEqual(mockSub);
      expect(mockPrisma.organizationSubscription.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.subscriptionInvoice.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackUsage', () => {
    it('should throw BadRequestException if limit exceeded', async () => {
      const mockSub = {
        id: 'sub-1',
        plan: {
          resourceLimits: [{ resourceKey: 'branches', limitType: 'LIMITED', limitValue: 2 }],
        },
      };
      mockPrisma.organizationSubscription.findFirst.mockResolvedValue(mockSub);
      mockPrisma.subscriptionUsage.findFirst.mockResolvedValue({ currentValue: 2 });

      await expect(
        service.trackUsage('org-1', { featureName: 'branches', incrementValue: 1 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if resource is disabled', async () => {
      const mockSub = {
        id: 'sub-1',
        plan: {
          resourceLimits: [{ resourceKey: 'api_calls', limitType: 'DISABLED', limitValue: null }],
        },
      };
      mockPrisma.organizationSubscription.findFirst.mockResolvedValue(mockSub);

      await expect(
        service.trackUsage('org-1', { featureName: 'api_calls', incrementValue: 1 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment usage successfully', async () => {
      const mockSub = {
        id: 'sub-1',
        plan: {
          resourceLimits: [{ resourceKey: 'branches', limitType: 'LIMITED', limitValue: 5 }],
        },
      };
      mockPrisma.organizationSubscription.findFirst.mockResolvedValue(mockSub);
      mockPrisma.subscriptionUsage.findFirst.mockResolvedValue({ id: 'usage-1', currentValue: 2 });
      mockPrisma.subscriptionUsage.update.mockResolvedValue({ currentValue: 3 });

      const result = await service.trackUsage('org-1', { featureName: 'branches', incrementValue: 1 });
      expect(result.currentValue).toBe(3);
    });

    it('should not enforce a limit for unlimited resources', async () => {
      const mockSub = {
        id: 'sub-1',
        plan: {
          resourceLimits: [{ resourceKey: 'members', limitType: 'UNLIMITED', limitValue: null }],
        },
      };
      mockPrisma.organizationSubscription.findFirst.mockResolvedValue(mockSub);
      mockPrisma.subscriptionUsage.findFirst.mockResolvedValue({ id: 'usage-1', currentValue: 500 });
      mockPrisma.subscriptionUsage.update.mockResolvedValue({ currentValue: 501 });

      const result = await service.trackUsage('org-1', { featureName: 'members', incrementValue: 1 });
      expect(result.currentValue).toBe(501);
    });
  });
});
