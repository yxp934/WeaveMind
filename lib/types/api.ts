// API类型定义
// WeaveMind LMS API端点类型定义

// 基础响应格式
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: string;
}

// 分页参数
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

// 分页响应
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

// ==================== 设置管理类型 ====================

// 设置作用域
export type SettingsScope = 'system' | 'organization' | 'user';

// 设置数据类型
export type SettingDataType = 'boolean' | 'string' | 'number' | 'json' | 'array';

// 引导状态
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

// 用户设置
export interface UserSetting {
  id: string;
  user_id?: string;
  organization_id?: string;
  scope: SettingsScope;
  setting_category: string;
  setting_key: string;
  setting_value: any;
  data_type: SettingDataType;
  default_value?: any;
  parent_setting_id?: string;
  override_level: number;
  can_override: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  validation_schema: any;
  is_active: boolean;
  is_deleted: boolean;
  description?: string;
  tags: any[];
  metadata: any;
}

// 设置创建/更新请求
export interface UserSettingUpdate {
  id?: string;
  user_id?: string;
  organization_id?: string;
  scope?: SettingsScope;
  setting_category: string;
  setting_key: string;
  setting_value: any;
  data_type?: SettingDataType;
  description?: string;
  tags?: any[];
  metadata?: any;
}

// 引导进度
export interface OnboardingProgress {
  id: string;
  user_id: string;
  organization_id?: string;
  template_id: string;
  status: OnboardingStatus;
  current_step_index: number;
  total_steps: number;
  completed_steps: number;
  started_at?: string;
  completed_at?: string;
  estimated_completion_at?: string;
  last_activity_at: string;
  step_data: any[];
  skipped_steps: any[];
  failed_steps: any[];
  completion_percentage: number;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  metadata: any;
}

// 引导进度更新
export interface OnboardingProgressUpdate {
  template_id?: string;
  status?: OnboardingStatus;
  current_step_index?: number;
  completed_steps?: number;
  step_data?: any[];
  skipped_steps?: any[];
  failed_steps?: any[];
}

// ==================== 自学习者类型 ====================

// 难度级别
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// 收藏类型
export type FavoriteType = 'course' | 'class' | 'chapter' | 'component';

// 活动类型
export type ActivityType = 'view_course' | 'complete_chapter' | 'complete_component' |
  'start_learning_session' | 'end_learning_session' | 'add_to_favorites' |
  'create_pathway' | 'update_pathway' | 'achieve_milestone' |
  'receive_achievement' | 'update_progress';

// 学习路径
export interface SelfLearnerPathway {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  difficulty_level: DifficultyLevel;
  estimated_duration_hours: number;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// 学习路径创建/更新
export interface SelfLearnerPathwayUpdate {
  title?: string;
  description?: string;
  difficulty_level?: DifficultyLevel;
  estimated_duration_hours?: number;
  is_public?: boolean;
  tags?: string[];
}

// 收藏
export interface SelfLearnerFavorite {
  id: string;
  user_id: string;
  course_id?: string;
  class_id?: string;
  chapter_id?: string;
  component_id?: string;
  favorite_type: FavoriteType;
  notes?: string;
  created_at: string;
}

// 收藏创建
export interface SelfLearnerFavoriteCreate {
  course_id?: string;
  class_id?: string;
  chapter_id?: string;
  component_id?: string;
  favorite_type: FavoriteType;
  notes?: string;
}

// 活动记录
export interface SelfLearnerActivity {
  id: string;
  user_id: string;
  pathway_id?: string;
  activity_type: ActivityType;
  metadata: any;
  duration_minutes?: number;
  created_at: string;
}

// ==================== 查询参数类型 ====================

// 设置查询参数
export interface SettingsQueryParams extends PaginationParams {
  scope?: SettingsScope;
  organization_id?: string;
  category?: string;
}

// 引导进度查询参数
export interface OnboardingProgressQueryParams extends PaginationParams {
  template_id?: string;
  status?: OnboardingStatus;
}

// 学习路径查询参数
export interface SelfLearnerPathwaysQueryParams extends PaginationParams {
  is_public?: boolean;
  difficulty_level?: DifficultyLevel;
  user_id?: string;
}

// 收藏查询参数
export interface SelfLearnerFavoritesQueryParams extends PaginationParams {
  favorite_type?: FavoriteType;
}

// ==================== 过滤和排序类型 ====================

// 排序选项
export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// 过滤器选项
export interface FilterOption {
  field: string;
  value: any;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
}