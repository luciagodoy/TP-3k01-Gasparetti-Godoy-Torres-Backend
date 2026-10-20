import {Employee, EmployeeStatus} from '../entities';
import {employeeRepository} from '../repositories/employee.repository';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface EmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  position: string;
  status?: EmployeeStatus;
}

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'position', 'status'] as const;

class EmployeeService extends BaseService<Employee> {
  protected readonly notFoundMessage = 'Empleado no encontrado';
  protected readonly deleteBlockedMessage = 'El empleado tiene registros asociados.';

  list(): Promise<Employee[]> {
    return this.repository.findAll();
  }

  create(input: EmployeeInput): Promise<Employee> {
    return this.repository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      position: input.position,
      status: input.status || EmployeeStatus.ACTIVE
    });
  }

  async update(id: number, input: Partial<EmployeeInput>): Promise<Employee> {
    const employee = await this.getById(id);
    return this.repository.update(employee, pickDefined(input, EDITABLE_FIELDS));
  }
}

export const employeeService = new EmployeeService(employeeRepository);
