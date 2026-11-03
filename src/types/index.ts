export type Priority = 'must_have' | 'nice_to_have' | 'dream';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // in local store or Supabase Auth
  avatar_url?: string;
  birthday?: string; // YYYY-MM-DD
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupMembership {
  group_id: string;
  user_id: string;
}

export interface Wish {
  id: string;
  user_id: string; // recipient
  title: string;
  description?: string;
  link_url?: string;
  image_url?: string;
  price?: number;
  currency?: string;
  priority: Priority;
  event_tag?: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  wish_id: string;
  reserved_by: string; // user_id
  created_at: string;
}

export interface ScrapedProductData {
  title?: string;
  image?: string;
  price?: number;
  description?: string;
  siteName?: string;
}
