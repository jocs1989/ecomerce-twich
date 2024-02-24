export class CreateProductDto {
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly images: string[];
  readonly review: string;
}
