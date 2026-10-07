export interface ReviewAuthor {
  username: string;
  avatarUrl: string | null;
}

export interface Review {
  id: string;
  restroomId: string;
  userId: string;
  /** 1–5 */
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
  author: ReviewAuthor;
  /** How many people marked it helpful */
  helpfulCount: number;
}

/** What the review form submits. */
export interface ReviewInput {
  rating: number;
  comment: string;
}
