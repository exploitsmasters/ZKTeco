import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { RealtimeService } from '../services/RealtimeService';

export interface Shift {
  id: string;
  name: string;
  nameAr: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate?: string;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none';
  repetitions?: number;
  isActive: boolean;
  assignedEmployees: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ShiftController {
  public router: Router;

  constructor(
    private dbService: DatabaseService,
    private realtimeService: RealtimeService
  ) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', this.getShifts.bind(this));
    this.router.get('/:shiftId', this.getShift.bind(this));
    this.router.post('/', this.createShift.bind(this));
    this.router.put('/:shiftId', this.updateShift.bind(this));
    this.router.delete('/:shiftId', this.deleteShift.bind(this));
    this.router.post('/:shiftId/assign', this.assignEmployees.bind(this));
    this.router.delete('/:shiftId/assign/:employeeId', this.unassignEmployee.bind(this));
    this.router.get('/:shiftId/schedule', this.getShiftSchedule.bind(this));
  }

  private async getShifts(req: Request, res: Response): Promise<void> {
    try {
      const { active, employee } = req.query;
      
      // In a real implementation, this would query the database
      const shifts = await this.dbService.getShifts();
      
      let filteredShifts = shifts;
      
      if (active !== undefined) {
        filteredShifts = filteredShifts.filter(s => s.isActive === (active === 'true'));
      }
      
      if (employee) {
        filteredShifts = filteredShifts.filter(s => 
          s.assignedEmployees.includes(employee as string)
        );
      }

      res.json({
        success: true,
        data: filteredShifts
      });
    } catch (error) {
      console.error('Error fetching shifts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shifts'
      });
    }
  }

  private async getShift(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params;
      
      const shift = await this.dbService.getShift(shiftId);
      
      if (!shift) {
        res.status(404).json({
          success: false,
          error: 'Shift not found'
        });
        return;
      }

      res.json({
        success: true,
        data: shift
      });
    } catch (error) {
      console.error('Error fetching shift:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch shift'
      });
    }
  }

  private async createShift(req: Request, res: Response): Promise<void> {
    try {
      const shiftData = req.body;
      
      // Validate required fields
      const requiredFields = ['name', 'nameAr', 'startTime', 'endTime', 'startDate'];
      for (const field of requiredFields) {
        if (!shiftData[field]) {
          res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
          return;
        }
      }

      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(shiftData.startTime) || !timeRegex.test(shiftData.endTime)) {
        res.status(400).json({
          success: false,
          error: 'Invalid time format. Use HH:MM format'
        });
        return;
      }

      const shift = {
        ...shiftData,
        assignedEmployees: shiftData.assignedEmployees || [],
        isActive: shiftData.isActive !== undefined ? shiftData.isActive : true
      };

      const createdShift = await this.dbService.createShift(shift);
      
      // Broadcast to connected clients
      this.realtimeService.broadcast({
        type: 'system_alert',
        data: {
          message: `New shift created: ${createdShift.nameAr}`,
          shift: createdShift
        },
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        data: createdShift
      });
    } catch (error) {
      console.error('Error creating shift:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create shift'
      });
    }
  }

  private async updateShift(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params;
      const updates = req.body;

      const existingShift = await this.dbService.getShift(shiftId);
      if (!existingShift) {
        res.status(404).json({
          success: false,
          error: 'Shift not found'
        });
        return;
      }

      const updatedShift = await this.dbService.updateShift(shiftId, updates);
      
      if (!updatedShift) {
        res.status(500).json({
          success: false,
          error: 'Failed to update shift'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedShift
      });
    } catch (error) {
      console.error('Error updating shift:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update shift'
      });
    }
  }

  private async deleteShift(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params;

      const shift = await this.dbService.getShift(shiftId);
      if (!shift) {
        res.status(404).json({
          success: false,
          error: 'Shift not found'
        });
        return;
      }

      const deleted = await this.dbService.deleteShift(shiftId);
      
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete shift'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Shift deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting shift:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete shift'
      });
    }
  }

  private async assignEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params;
      const { employeeIds } = req.body;

      if (!Array.isArray(employeeIds)) {
        res.status(400).json({
          success: false,
          error: 'employeeIds must be an array'
        });
        return;
      }

      const shift = await this.dbService.getShift(shiftId);
      if (!shift) {
        res.status(404).json({
          success: false,
          error: 'Shift not found'
        });
        return;
      }

      // Verify all employees exist
      for (const employeeId of employeeIds) {
        const employee = await this.dbService.getEmployee(employeeId);
        if (!employee) {
          res.status(404).json({
            success: false,
            error: `Employee ${employeeId} not found`
          });
          return;
        }
      }

      const updatedAssignments = [...new Set([...shift.assignedEmployees, ...employeeIds])];
      
      const updatedShift = await this.dbService.updateShift(shiftId, {
        assignedEmployees: updatedAssignments
      });

      res.json({
        success: true,
        data: updatedShift,
        message: `Assigned ${employeeIds.length} employees to shift`
      });
    } catch (error) {
      console.error('Error assigning employees to shift:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign employees to shift'
      });
    }
  }

  private async unassignEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId, employeeId } = req.params;

      const shift = await this.dbService.getShift(shiftId);
      if (!shift) {
        res.status(404).json({
          success: false,
          error: 'Shift not found'
        });
        return;
      }

      const updatedAssignments = shift.assignedEmployees.filter(id => id !== employeeId);
      
      const updatedShift = await this.dbService.updateShift(shiftId, {
        assignedEmployees: updatedAssignments
      });

      res.json({
        success: true,
        data: updatedShift,
        message: `Unassigned employee ${employeeId} from shift`
      });
    } catch (error) {
      console.error('Error unassigning employee from shift:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unassign employee from shift'
      });
    }
  }

  private async getShiftSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { shiftId } = req.params;
      const { startDate, endDate } = req.query;

      const shift = await this.dbService.getShift(shiftId);
      if (!shift) {
        res.status(404).json({
          success: false,
          error: 'Shift not found'
        });
        return;
      }

      // Generate schedule based on shift recurrence
      const schedule = this.generateShiftSchedule(
        shift,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: {
          shift,
          schedule
        }
      });
    } catch (error) {
      console.error('Error getting shift schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get shift schedule'
      });
    }
  }

  private generateShiftSchedule(shift: Shift, startDate?: string, endDate?: string): any[] {
    const schedule = [];
    const start = new Date(startDate || shift.startDate);
    const end = new Date(endDate || shift.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    let currentDate = new Date(start);
    let repetitionCount = 0;

    while (currentDate <= end) {
      if (shift.repetitions && repetitionCount >= shift.repetitions) {
        break;
      }

      schedule.push({
        date: currentDate.toISOString().split('T')[0],
        startTime: shift.startTime,
        endTime: shift.endTime,
        assignedEmployees: shift.assignedEmployees
      });

      // Calculate next occurrence based on recurrence
      switch (shift.recurrence) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'none':
          break;
      }

      repetitionCount++;
      
      if (shift.recurrence === 'none') break;
    }

    return schedule;
  }
}