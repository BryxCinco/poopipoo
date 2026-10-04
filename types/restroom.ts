export interface Restroom {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  reviewCount: number;
  amenities: Amenity[];
  images: string[];
  isFree: boolean;
  createdAt: string;
}

export type Amenity =
  | 'bidet'
  | 'tissue'
  | 'soap'
  | 'wheelchair'
  | 'baby-changing'
  | 'shower'
  | 'air-conditioned'
  | 'free';
