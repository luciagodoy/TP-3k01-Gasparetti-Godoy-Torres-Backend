import {Employee} from '../entities';
import {BaseRepository} from './base.repository';

class EmployeeRepository extends BaseRepository<Employee> {
  constructor() {
    super(Employee);
  }
}

export const employeeRepository = new EmployeeRepository();
