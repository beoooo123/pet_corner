import { BannerStatus } from '../enums/banner.enum.js';

export interface IBanner {
  _id: string;
  title: string;
  image_url: string;
  link_url: string;
  order: number;
  status: BannerStatus;
  createdAt?: Date;
  updatedAt?: Date;
}
