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
  /** Profile id of the user who added it; null for seeded restrooms. */
  createdBy?: string | null;
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
