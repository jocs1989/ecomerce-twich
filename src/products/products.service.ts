import { DataSource, Repository } from 'typeorm';

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
    private readonly dataSource: DataSource,
  ) {}
  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const newProduct = this.preloadNewProduct(createProductDto);
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
      throw new NotFoundException(`Product${id} not exist`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...all } = updateProductDto;
    const product = await this.productsRepository.preload({
      id,
      ...all,
    });

    if (!product) {
      throw new NotFoundException('Product not exist');
    }
    // create a new query runner
    const queryRunner = this.dataSource.createQueryRunner(); // creando el query
    // establish real database connection using our new query runner
    await queryRunner.connect(); // se conecta a la base de datos
    await queryRunner.startTransaction(); // iniciar trasanccion
    try {
      if (images) {
        //vinculada al ID que utilizamos
        await queryRunner.manager.delete(ImagesProducts, { product: { id } });
        product.images = images.map((url) =>
          this.imagesRepository.create({ url }),
        );
      } else {
        product.images = await this.imagesRepository.findBy({
          product: { id },
        });
      }

      // execute some operations on this transaction:
      await queryRunner.manager.save(product);
      // commit transaction now:
      await queryRunner.commitTransaction();
      return product;
    } catch {
      // since we have errors let's rollback changes we made
      await queryRunner.rollbackTransaction();
      throw new ConflictException('Algo ocurrio');
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
    }
  }
  async update2(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...all } = updateProductDto;
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not exist');
    }

    if (!images) {
      const newProduct = await this.productsRepository.preload({
        ...product,
        ...all,
      });

      if (!newProduct) {
        throw new NotFoundException('Product not exist');
      }
      return await this.productsRepository.save(newProduct);
    } else {
      // Eliminar las imágenes asociadas al producto
      await Promise.all(
        product.images.map(async (image) => {
          await this.imagesRepository.remove(image);
        }),
      );

      const newProduct = await this.productsRepository.preload({
        id,
        ...all,
        images: images.map((url) => this.imagesRepository.create({ url })),
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

    // Eliminar el producto
    await this.productsRepository.remove(product);

    return product;
  }
  private preloadNewProduct(createProductDto: CreateProductDto) {
    const { images, ...all } = createProductDto;
    const newProduct = this.productsRepository.create({
      ...all,
      images: images.map((url) => {
        return this.imagesRepository.create({ url });
      }),
    });
    return newProduct;
  }

  private async preloadImagesProducts(url: string) {
    const existImages = await this.imagesRepository.findOne({
      where: {
        url,
      },
    });
    if (existImages) {
      return existImages;
    }
    return this.imagesRepository.create({ url });
  }
}
