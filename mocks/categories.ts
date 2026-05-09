import { Category } from '@/types';

const catBouquets = require('@/assets/images/cat-all.png');
const catFlowers = require('@/assets/images/cat-flowers.png');
const catCake = require('@/assets/images/cat-cake.png');
const catGifts = require('@/assets/images/cat-gifts.png');
const catChocolates = require('@/assets/images/cat-chocolates.png');

export const categoryImages: Record<string, any> = {
  '1': catBouquets,
  '2': catFlowers,
  '3': catCake,
  '4': catGifts,
  '5': catChocolates,
};

export const categories: Category[] = [
  {
    id: '0',
    name: 'الكل',
    nameEn: 'All',
    icon: 'grid-2x2',
    image: '',
    count: 0,
  },
  {
    id: '1',
    name: 'باقات',
    nameEn: 'Bouquets',
    icon: 'flower',
    image: '',
    count: 0,
  },
  {
    id: '2',
    name: 'ورود',
    nameEn: 'Flowers',
    icon: 'flower-2',
    image: '',
    count: 0,
  },
  {
    id: '3',
    name: 'كيك',
    nameEn: 'Cakes',
    icon: 'cake-slice',
    image: '',
    count: 0,
  },
  {
    id: '4',
    name: 'هدايا',
    nameEn: 'Gifts',
    icon: 'gift',
    image: '',
    count: 0,
  },
  {
    id: '5',
    name: 'شوكولاته',
    nameEn: 'Chocolates',
    icon: 'candy',
    image: '',
    count: 0,
  },
];
