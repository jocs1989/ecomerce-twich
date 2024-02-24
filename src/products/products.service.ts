import { promises } from 'dns';
import { Repository } from 'typeorm';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImagesProducts } from './entities/images.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ImagesProducts)
    private readonly imagesRepository: Repository<ImagesProducts>,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const { images, ...all } = createProductDto;
      const newProduct = this.productsRepository.create({
        ...all,
        images: images.map((url) => {
          return this.imagesRepository.create({ url });
        }),
      });

      return await this.productsRepository.save(newProduct);
    } catch (err) {
      const phUniqueViolationErrorCode = '23505';
      if (err.code === phUniqueViolationErrorCode) {
        throw new ConflictException('This product exist');
      }
    }
  }

  async findAll() {
    return await this.productsRepository.find({
      relations: { images: true },
    });
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not exist');
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...all } = updateProductDto;

    if (!images) {
      const newProduct = await this.productsRepository.preload({ id, ...all });
      if (!newProduct) {
        throw new NotFoundException('Product not exist');
      }
      return await this.productsRepository.save(newProduct);
    } else {
      const newProduct = await this.productsRepository.preload({
        id,
        ...all,
        images: images.map((img) => this.imagesRepository.create({ url: img })),
      });
      if (!newProduct) {
        throw new NotFoundException('Product not exist');
      }

      return await this.productsRepository.save(newProduct);
    }
  }

  async remove(id: string) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!product) {
      throw new NotFoundException('Product not exist');
    }

    // Eliminar las imágenes asociadas al producto
    await Promise.all(
      product.images.map(async (image) => {
        await this.imagesRepository.remove(image);
      }),
    );

    // Eliminar el producto
    await this.productsRepository.remove(product);

    return product;
  }
}
