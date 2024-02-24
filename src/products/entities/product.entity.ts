import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ImagesProducts } from './images.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  name: string;

  @Column()
  description: string;

  @Column('numeric')
  price: number;

  @OneToMany(() => ImagesProducts, (images) => images.product, {
    cascade: true,
  })
  images: ImagesProducts[];

  @Column('text')
  review: string;
}
