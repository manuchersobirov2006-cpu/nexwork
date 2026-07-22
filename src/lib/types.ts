export type UserRole = 'freelancer' | 'employer' | 'admin';
export type VerificationLevel = 'none' | 'phone' | 'identity' | 'full';

export interface SocialLinks {
  telegram?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  linkedin?: string;
  youtube?: string;
}

export interface Profile {
  id: string;
  public_id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: UserRole;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  skills: string[];
  categories: string[];
  languages: string[];
  is_verified: boolean;
  verification_level: VerificationLevel;
  rating: number;
  review_count: number;
  completed_orders: number;
  balance: number;
  is_premium: boolean;
  premium_until: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  is_online: boolean;
  last_seen: string;
  response_rate: number;
  response_time: string | null;
  email_notifications_enabled: boolean;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

export interface Gig {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  delivery_days: number;
  revisions: number;
  image_urls: string[];
  gallery: string[];
  status: 'active' | 'paused' | 'draft' | 'deleted';
  orders_count: number;
  views: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  seller?: Profile;
  packages?: GigPackage[];
  extras?: GigExtra[];
}

export interface GigPackage {
  id: string;
  gig_id: string;
  tier: 'basic' | 'standard' | 'premium';
  title: string;
  description: string | null;
  price: number;
  delivery_days: number;
  revisions: number;
  created_at: string;
  updated_at: string;
}

export interface GigExtra {
  id: string;
  gig_id: string;
  title: string;
  price: number;
  delivery_days_delta: number;
  created_at: string;
}

export interface SelectedExtra {
  id: string;
  title: string;
  price: number;
}

export interface Order {
  id: string;
  gig_id: string | null;
  gig_package_id: string | null;
  selected_extras: SelectedExtra[];
  project_id: string | null;
  bid_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: 'pending' | 'active' | 'delivered' | 'completed' | 'cancelled' | 'disputed';
  price: number;
  requirements: string | null;
  delivery_deadline: string | null;
  delivery_note: string | null;
  delivery_link: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  gig?: Gig;
  gig_package?: GigPackage;
  project?: Project;
  buyer?: Profile;
  seller?: Profile;
}

export interface Project {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_fixed: number | null;
  currency: string;
  deadline: string | null;
  duration_days: number | null;
  attachments: string[];
  skills_required: string[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  bids_count: number;
  views: number;
  created_at: string;
  updated_at: string;
  employer?: Profile;
  bids?: Bid[];
}

export interface Bid {
  id: string;
  project_id: string;
  freelancer_id: string;
  bid_amount: number;
  delivery_days: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  portfolio_item_ids: string[];
  created_at: string;
  freelancer?: Profile;
}

export interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_urls: string[];
  link_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  image_url: string | null;
  issued_by: string | null;
  created_at: string;
}

export interface BadgeRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  months: number;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  resume_url: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
  applicant?: Profile;
  job?: Job;
}

export interface Chat {
  id: string;
  participant_1: string;
  participant_2: string;
  related_order_id: string | null;
  related_gig_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  otherUser?: Profile;
  lastMessage?: Message;
}

export interface BidMessageMetadata {
  bid_id: string;
  project_id: string;
  project_title: string;
  employer_id: string;
  freelancer_id: string;
  bid_amount: number;
  delivery_days: number;
  message: string;
  portfolio_item_ids: string[];
}

export interface JobApplicationMessageMetadata {
  application_id: string;
  job_id: string;
  job_title: string;
  employer_id: string;
  applicant_id: string;
  cover_letter: string | null;
  resume_url: string | null;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  attachments: string[];
  is_read: boolean;
  message_type: 'text' | 'bid' | 'job_application';
  metadata: BidMessageMetadata | JobApplicationMessageMetadata | Record<string, never>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'order' | 'message' | 'bid' | 'review' | 'system' | 'payment' | 'verification' | 'premium';
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  gig_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Profile;
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  logo_url: string | null;
  location: string | null;
  is_verified: boolean;
  employees_count: number;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string | null;
  employer_id: string;
  title: string;
  description: string;
  category: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  job_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead';
  location: string | null;
  is_remote: boolean;
  skills_required: string[];
  status: 'active' | 'closed' | 'draft' | 'filled';
  applicants_count: number;
  views: number;
  contact_phone: string | null;
  social_links: SocialLinks;
  created_at: string;
  employer?: Profile;
  company?: Company;
}

export interface Task {
  id: string;
  owner_id: string;
  related_order_id: string | null;
  related_project_id: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  due_date: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  gig_id: string | null;
  specialist_id: string | null;
  created_at: string;
  gig?: Gig;
  specialist?: Profile;
}

export interface IdentityVerification {
  id: string;
  user_id: string;
  face_photo_path: string;
  passport_photo_path: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_table: string;
  target_id: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface PlatformContent {
  id: string;
  section: string;
  key: string;
  title: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformCategory {
  id: string;
  key: string;
  label: string;
  label_en: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformTranslation {
  id: string;
  locale: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}
