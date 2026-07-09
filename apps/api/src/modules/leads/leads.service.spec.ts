import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { DatabaseService } from '../../core/database/database.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  leadSource: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  leadStatus: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  gym: {
    findUnique: jest.fn(),
  },
  employee: {
    findFirst: jest.fn(),
  },
  leadAssignment: {
    create: jest.fn(),
  },
  leadActivity: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: DatabaseService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLeadSource', () => {
    it('should create a lead source successfully', async () => {
      const mockResult = { id: 'source-1', organizationId: 'org-1', name: 'Web' };
      mockPrisma.leadSource.create.mockResolvedValue(mockResult);

      const result = await service.createLeadSource('org-1', { name: 'Web' });
      expect(result).toEqual(mockResult);
      expect(mockPrisma.leadSource.create).toHaveBeenCalledWith({
        data: { organizationId: 'org-1', name: 'Web' },
      });
    });
  });

  describe('createLead', () => {
    it('should throw NotFoundException if gym does not belong to organization', async () => {
      mockPrisma.gym.findUnique.mockResolvedValue({ id: 'gym-1', organizationId: 'org-2' });

      await expect(
        service.createLead('org-1', {
          gymId: 'gym-1',
          sourceId: 'source-1',
          statusId: 'status-1',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '1234567890',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a lead successfully if validations pass', async () => {
      mockPrisma.gym.findUnique.mockResolvedValue({ id: 'gym-1', organizationId: 'org-1' });
      mockPrisma.leadSource.findUnique.mockResolvedValue({ id: 'source-1', organizationId: 'org-1' });
      mockPrisma.leadStatus.findUnique.mockResolvedValue({ id: 'status-1', organizationId: 'org-1' });
      
      const mockLead = { id: 'lead-1', firstName: 'John', lastName: 'Doe' };
      mockPrisma.lead.create.mockResolvedValue(mockLead);

      const result = await service.createLead('org-1', {
        gymId: 'gym-1',
        sourceId: 'source-1',
        statusId: 'status-1',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
      });

      expect(result).toEqual(mockLead);
    });
  });

  describe('assignLead', () => {
    it('should assign an employee to a lead successfully', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', organizationId: 'org-1' });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-1', organizationId: 'org-1' });
      mockPrisma.leadAssignment.create.mockResolvedValue({ id: 'assign-1' });

      const result = await service.assignLead('org-1', 'lead-1', { employeeId: 'emp-1' });
      expect(result).toEqual({ id: 'assign-1' });
    });
  });

  describe('createLeadActivity', () => {
    it('should create a lead activity successfully', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1', organizationId: 'org-1' });
      mockPrisma.employee.findFirst.mockResolvedValue({ id: 'emp-1', organizationId: 'org-1' });
      mockPrisma.leadActivity.create.mockResolvedValue({ id: 'activity-1' });

      const result = await service.createLeadActivity('org-1', 'lead-1', {
        employeeId: 'emp-1',
        activityType: 'Call',
        notes: 'Called lead, they will visit tomorrow',
      });

      expect(result).toEqual({ id: 'activity-1' });
    });
  });
});
