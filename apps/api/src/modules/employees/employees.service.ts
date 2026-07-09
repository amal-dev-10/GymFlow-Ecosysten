import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { CreateEmployeeDto, AssignGymDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: DatabaseService) {}

  async createEmployee(organizationId: string, dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        organizationId,
        ...dto,
      },
    });
  }

  async assignGym(organizationId: string, employeeId: string, dto: AssignGymDto) {
    // Verify gym belongs to org
    const gym = await this.prisma.gym.findUnique({
      where: { id: dto.gymId },
    });

    if (!gym || gym.organizationId !== organizationId) {
      throw new NotFoundException('Gym not found in this organization');
    }

    return this.prisma.employeeGymAssignment.upsert({
      where: {
        employeeId_gymId: {
          employeeId,
          gymId: dto.gymId,
        },
      },
      update: {
        isPrimary: dto.isPrimary,
        isBranchManager: dto.isBranchManager,
      },
      create: {
        employeeId,
        gymId: dto.gymId,
        isPrimary: dto.isPrimary || false,
        isBranchManager: dto.isBranchManager || false,
      },
    });
  }
}
