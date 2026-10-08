// Note: `type` (not `interface`) is required — supabase-js generics need
// Record<string, unknown>, which interfaces don't satisfy.

/**
 * Supabase database types, written by hand to match
 * supabase/migrations/ (0001–0005). Keep the two in sync.
 * (Can be replaced later with `supabase gen types typescript`.)
 */

export type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  /** Read-only for users: maintained by the award_points() trigger (0004) */
  points: number;
  /** 1–5, from calculate_level(points) */
  level: number;
  /** Badge ids (lib/badges.ts); written by the server with the secret key */
  badges: string[];
  /** Phase 11, read-only for users (trigger-maintained, see 0005) */
  trust_score: number;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  role: UserRole;
  created_at: string;
};

export type UserRole = "user" | "moderator" | "admin";
export type { RestroomStatus } from "@/types/restroom";
import type { RestroomStatus } from "@/types/restroom";
export type { ReviewStatus } from "@/types/review";
import type { ReviewStatus } from "@/types/review";
export type ReportTargetType = "restroom" | "review" | "user";
export type ReportReason = "fake" | "inappropriate" | "spam" | "duplicate" | "other";
export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
export type ModerationAction = "approve" | "reject" | "flag" | "ban" | "unban";

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
  /** Phase 11: moderation status + "Nakita ko na ito" votes (read-only for users) */
  status: RestroomStatus;
  verified_count: number;
  /** Phase 12: where it came from (read-only for users) */
  source: RestroomSource;
};

export type RestroomSource = "user" | "osm" | "seed";

/**
 * The restrooms table also has `embedding vector(384)` (Phase 8). It's left out
 * of RestroomRow on purpose: app queries select RESTROOM_COLUMNS (without it)
 * so the big vector isn't downloaded with every restroom. PostgREST returns
 * vectors as text like "[0.1,0.2,...]".
 */
export type RestroomTableRow = RestroomRow & {
  embedding: string | null;
  /** Phase 10; not in RESTROOM_COLUMNS yet (nothing in the UI uses it) */
  is_verified: boolean;
  /** Phase 11 moderation columns (read-only for users; moderators read them) */
  flag_count: number;
  ai_flagged: boolean;
  ai_flag_reason: string | null;
  /** When the AI check ran; null = not checked yet */
  ai_checked_at: string | null;
  /** Phase 12: the OpenStreetMap element (OSM imports only) */
  osm_type: "node" | "way" | "relation" | null;
  osm_id: string | null;
};

/** A row from the match_restrooms() vector search (doesn't return `source`). */
export type RestroomMatchRow = Omit<RestroomRow, "source"> & { similarity: number };

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
  /** Maintained by the review_votes trigger (0004) */
  helpful_count: number;
  /** Phase 11 (read-only for users) */
  status: ReviewStatus;
  flag_count: number;
  created_at: string;
};

export type ReviewVoteRow = {
  review_id: string;
  user_id: string;
  created_at: string;
};

export type RestroomSubmissionRow = {
  id: string;
  user_id: string;
  submitted_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
};

export type RestroomVerificationRow = {
  restroom_id: string;
  user_id: string;
  created_at: string;
};

export type ModerationLogRow = {
  id: string;
  /** null = automatic (AI) */
  moderator_id: string | null;
  action: ModerationAction;
  target_type: ReportTargetType;
  target_id: string;
  reason: string | null;
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
  // Writable by the secret (admin) key only, used by the seed/import scripts.
  // rating/review_count are maintained by the reviews trigger.
  created_at?: string;
  status?: RestroomStatus;
  ai_checked_at?: string | null;
  source?: RestroomSource;
  osm_type?: "node" | "way" | "relation" | null;
  osm_id?: string | null;
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
        // points/level are trigger-only; badges are writable by the secret (admin) key only
        Update: Partial<Pick<ProfileRow, "username" | "avatar_url" | "badges">>;
        Relationships: [];
      };
      review_votes: {
        Row: ReviewVoteRow;
        Insert: Pick<ReviewVoteRow, "review_id" | "user_id">;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
      restroom_submissions: {
        Row: RestroomSubmissionRow;
        // Written by the restrooms insert trigger only
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Pick<ReportRow, "reporter_id" | "target_type" | "target_id" | "reason"> &
          Partial<Pick<ReportRow, "details">>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      restroom_verifications: {
        Row: RestroomVerificationRow;
        Insert: Pick<RestroomVerificationRow, "restroom_id" | "user_id">;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "restroom_verifications_restroom_id_fkey";
            columns: ["restroom_id"];
            isOneToOne: false;
            referencedRelation: "restrooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restroom_verifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_log: {
        Row: ModerationLogRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
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
      /** NULL = may add a restroom now; otherwise when it's allowed again */
      my_rate_limit_retry_at: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      check_rate_limit: {
        Args: { user_id: string };
        Returns: boolean;
      };
      /** Moderators/admins only (the function checks) */
      moderate_content: {
        Args: { target_type: "restroom" | "review"; target_id: string; decision: "approve" | "reject"; reason?: string | null };
        Returns: undefined;
      };
      ban_user: {
        Args: { user_id: string; reason: string };
        Returns: undefined;
      };
      unban_user: {
        Args: { user_id: string };
        Returns: undefined;
      };
      /** Secret key only (/api/moderate). Returns true when it flagged the restroom. */
      record_ai_moderation: {
        Args: { restroom_id: string; is_suspicious: boolean; reason: string; confidence: number };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
