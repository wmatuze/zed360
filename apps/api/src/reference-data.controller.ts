import { Controller, Get } from '@nestjs/common';
import { ReferenceDataService } from './reference-data.service';

@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceData: ReferenceDataService) {}

  @Get()
  getAll() {
    return this.referenceData.getAll();
  }
}
