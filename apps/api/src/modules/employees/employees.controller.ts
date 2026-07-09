import { Controller, Post, Body, Req, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, AssignGymDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { TenantGuard } from '../../core/guards/tenant.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { RequirePermissions } from '../../core/decorators/require-permissions.decorator';

@Controller('v1/employees')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @RequirePermissions({ resource: 'employees', action: 'create' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createEmployee(@Req() req, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.createEmployee(req.organizationId, dto);
  }

  @RequirePermissions({ resource: 'employees', action: 'assign_gym' })
  @Post(':id/gym-assignments')
  @HttpCode(HttpStatus.OK)
  assignGym(@Req() req, @Param('id') id: string, @Body() dto: AssignGymDto) {
    return this.employeesService.assignGym(req.organizationId, id, dto);
  }
}
