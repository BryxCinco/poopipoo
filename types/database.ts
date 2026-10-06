// Note: `type` (not `interface`) is required — supabase-js generics need
// Record<string, unknown>, which interfaces don't satisfy.

/**
 * Supabase database types, written by hand to match
 * supabase/migrations/0001_init.sql. Keep the two in sync.
 * (Can be replaced later with `supabase gen types typescript`.)
 */

export type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  points: number;
  created_at: string;
};

export type RestroomRow = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  is_free: boolean;
  images: string[];
  rating: number;
  review_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  restroom_id: string;
  user_id: string;
  rating: number;
  comment: string;
  images: string[];
  created_at: string;
};

// Insert/Update shapes follow the column grants in the migration:
// only these columns are writable by signed-in users.
export type RestroomInsert = {
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  amenities?: string[];
  is_free?: boolean;
  images?: string[];
  created_by: string | null;
  // Writable by the secret (admin) key only, used by the seed script.
  // rating/review_count are maintained by the reviews trigger.
  created_at?: string;
};

export type RestroomUpdate = Partial<
  Pick<
    RestroomRow,
    "name" | "description" | "address" | "latitude" | "longitude" | "amenities" | "is_free" | "images"
  >
>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Pick<ProfileRow, "id"> & Partial<Omit<ProfileRow, "id">>;
        Update: Partial<Pick<ProfileRow, "username" | "avatar_url">>;
        Relationships: [];
      };
      restrooms: {
        Row: RestroomRow;
        Insert: RestroomInsert;
        Update: RestroomUpdate;
        Relationships: [
          {
            foreignKeyName: "restrooms_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: ReviewRow;
        Insert: Pick<ReviewRow, "restroom_id" | "user_id" | "rating"> &
          Partial<Pick<ReviewRow, "comment" | "images">>;
        Update: Partial<Pick<ReviewRow, "rating" | "comment" | "images">>;
        Relationships: [
          {
            foreignKeyName: "reviews_restroom_id_fkey";
            columns: ["restroom_id"];
            isOneToOne: false;
            referencedRelation: "restrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
