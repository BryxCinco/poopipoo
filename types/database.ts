// Note: `type` (not `interface`) is required — supabase-js generics need
// Record<string, unknown>, which interfaces don't satisfy.

/**
 * Supabase database types, written by hand to match
 * supabase/migrations/ (0001–0003). Keep the two in sync.
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

/**
 * The restrooms table also has `embedding vector(384)` (Phase 8). It's left out
 * of RestroomRow on purpose: app queries select RESTROOM_COLUMNS (without it)
 * so the big vector isn't downloaded with every restroom. PostgREST returns
 * vectors as text like "[0.1,0.2,...]".
 */
export type RestroomTableRow = RestroomRow & { embedding: string | null };

/** A row from the match_restrooms() vector search. */
export type RestroomMatchRow = RestroomRow & { similarity: number };

export type AgentQueryRow = {
  id: number;
  user_id: string;
  created_at: string;
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
        Row: RestroomTableRow;
        Insert: RestroomInsert;
        // embedding: writable by the secret (admin) key only
        Update: RestroomUpdate & { embedding?: string | null };
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
      agent_queries: {
        Row: AgentQueryRow;
        Insert: Pick<AgentQueryRow, "user_id">;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "agent_queries_user_id_fkey";
            columns: ["user_id"];
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
    Functions: {
      match_restrooms: {
        Args: {
          /** pgvector accepts a JSON number array (or its text form) */
          query_embedding: number[] | string;
          match_threshold: number;
          match_count: number;
        };
        Returns: RestroomMatchRow[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
