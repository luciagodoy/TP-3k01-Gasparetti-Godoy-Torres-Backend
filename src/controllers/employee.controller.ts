import {Request, Response} from 'express';
import {employeeService, EmployeeInput} from '../services/employee.service';
import {parseId} from '../shared/http';

export const employeeController = {
  async list(_req: Request, res: Response): Promise<void> {
    res.json(await employeeService.list());
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await employeeService.getById(parseId(req.params.id)));
  },

  async create(req: Request<{}, {}, EmployeeInput>, res: Response): Promise<void> {
    res.status(201).json(await employeeService.create(req.body));
  },

  async update(req: Request<{id: string}, {}, Partial<EmployeeInput>>, res: Response): Promise<void> {
    res.json(await employeeService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await employeeService.remove(parseId(req.params.id));
    res.status(204).send();
  }
};
