export interface StoreData {
  id: string;
  name: string;
  username: string;
  city: string;
  cityEn: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  description: string;
  logo: string;
  image: string;
  categories: string;
  isOpen: boolean;
  distance: number;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

export const allStores: StoreData[] = [];
