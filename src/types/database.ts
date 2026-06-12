export type Restaurant = {
  id: string;
  name: string;
  description: string;
  location: string;
  avg_rating: number;
  created_at: string;
};

export type Review = {
  id: string;
  restaurant_id: string;
  content: string;
  rating: number;
  image_url?: string | null;
  created_at: string;
};
