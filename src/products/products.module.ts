import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImagesProducts } from './entities/images.entity';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ImagesProducts])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
