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
  /**
   * Moderation status (Phase 11). Missing on local/mock data, which counts as
   * approved. 'rejected' rows only reach their author and moderators (RLS).
   */
  status?: RestroomStatus;
  /** How many people confirmed it exists ("Nakita ko na ito") */
  verifiedCount?: number;
}

export type RestroomStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type Amenity =
  | 'bidet'
  | 'tissue'
  | 'soap'
  | 'wheelchair'
  | 'baby-changing'
  | 'shower'
  | 'air-conditioned'
  | 'free';
