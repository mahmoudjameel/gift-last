import { Category } from '@/types';

const catAll = require('@/assets/images/cat-all.png');
const catFlowers = require('@/assets/images/cat-flowers.png');
const catCake = require('@/assets/images/cat-cake.png');
const catGifts = require('@/assets/images/cat-gifts.png');
const catChocolates = require('@/assets/images/cat-chocolates.png');

export const categoryImages: Record<string, any> = {
  '1': catAll,
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
    name: 'حجوزات للمناسبات',
    nameEn: 'Event Bookings',
    icon: 'calendar-heart',
    image: '',
    count: 0,
  },
  {
    id: '2',
    name: 'زهور',
    nameEn: 'Flowers',
    icon: 'flower-2',
    image: '',
    count: 0,
  },
  {
    id: '3',
    name: 'كوزمتكس وعطور',
    nameEn: 'Cosmetics & Perfumes',
    icon: 'sparkles',
    image: '',
    count: 0,
  },
  {
    id: '4',
    name: 'حلويات وكنفتوريا',
    nameEn: 'Sweets & Confectionery',
    icon: 'candy',
    image: '',
    count: 0,
  },
  {
    id: '5',
    name: 'ساعات وإكسسوارات',
    nameEn: 'Watches & Accessories',
    icon: 'watch',
    image: '',
    count: 0,
  },
  {
    id: '6',
    name: 'هدايا',
    nameEn: 'Gifts',
    icon: 'gift',
    image: '',
    count: 0,
  },
];
