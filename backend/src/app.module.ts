import { Module } from '@nestjs/common';
import { BondModule } from './bond/bond.module';

@Module({
  imports: [BondModule],
})
export class AppModule {}

