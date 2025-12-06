// Discussion System Type Definitions

export interface DiscussionThread {
  id: string;
  class_id: string;
  course_id?: string;
  assignment_id?: string;
  organization_id: string;
  title: string;
  description?: string;
  type: 'general' | 'course' | 'assignment' | 'announcement';
  is_pinned: boolean;
  is_locked: boolean;
  is_public: boolean;
  post_count: number;
  last_activity_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface DiscussionPost {
  id: string;
  thread_id: string;
  parent_post_id?: string;
  user_id: string;
  title?: string;
  content: string;
  post_type: 'text' | 'markdown' | 'code';
  attachments?: any[];
  depth: number;
  reply_count: number;
  like_count: number;
  dislike_count: number;
  is_edited: boolean;
  edit_count: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface DiscussionParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  notification_level: 'none' | 'normal' | 'high';
  last_read_at?: string;
  post_count: number;
  first_post_at?: string;
  last_post_at?: string;
  is_muted: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscussionReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: 'like' | 'dislike' | 'helpful' | 'confusing';
  created_at: string;
}

// Request Types
export interface CreateThreadRequest {
  class_id: string;
  course_id?: string;
  assignment_id?: string;
  title: string;
  description?: string;
  type: 'general' | 'course' | 'assignment' | 'announcement';
  is_pinned?: boolean;
  is_public?: boolean;
}

export interface UpdateThreadRequest {
  title?: string;
  description?: string;
  is_pinned?: boolean;
  is_locked?: boolean;
  is_public?: boolean;
}

export interface CreatePostRequest {
  thread_id: string;
  parent_post_id?: string;
  title?: string;
  content: string;
  post_type: 'text' | 'markdown' | 'code';
  attachments?: any[];
}

export interface UpdatePostRequest {
  content?: string;
  post_type?: 'text' | 'markdown' | 'code';
  attachments?: any[];
}

export interface ThreadFilters {
  type?: 'general' | 'course' | 'assignment' | 'announcement';
  is_pinned?: boolean;
  class_id?: string;
  course_id?: string;
  assignment_id?: string;
}

export interface PostFilters {
  depth?: number;
  user_id?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SortParams {
  sortBy?: 'last_activity_at' | 'created_at' | 'post_count' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: string;
  details?: any;
}

export interface ThreadWithMeta extends DiscussionThread {
  creator?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  user_participation?: {
    is_participant: boolean;
    last_read_at?: string;
    post_count: number;
  };
}

export interface PostWithMeta extends DiscussionPost {
  author?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  reactions?: {
    like_count: number;
    dislike_count: number;
    user_reaction?: 'like' | 'dislike' | 'helpful' | 'confusing';
  };
  children?: PostWithMeta[];
}

export interface ParticipantWithUser extends DiscussionParticipant {
  user?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}
