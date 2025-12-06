// Zod验证模式
// WeaveMind LMS API端点验证模式

import { z } from 'zod';

// 通用验证模式
export const uuidSchema = z.string().uuid('Invalid UUID format');

// 分页验证模式
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
  page: z.coerce.number().min(1).optional(),
});

// 排序验证模式
export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

// 过滤器验证模式
export const filterSchema = z.object({
  field: z.string(),
  value: z.any(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'between']).optional(),
});

// ==================== 设置管理验证模式 ====================

// 设置作用域
export const settingsScopeSchema = z.enum(['system', 'organization', 'user']);

// 设置数据类型
export const settingDataTypeSchema = z.enum(['boolean', 'string', 'number', 'json', 'array']);

// 用户设置验证
export const userSettingSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  organization_id: uuidSchema.optional(),
  scope: settingsScopeSchema.optional(),
  setting_category: z.string().min(1).max(100),
  setting_key: z.string().min(1).max(100),
  setting_value: z.any(),
  data_type: settingDataTypeSchema.default('json'),
  description: z.string().max(500).optional(),
  tags: z.array(z.any()).default([]),
  metadata: z.object({}).default({}),
});

// 用户设置更新验证
export const userSettingUpdateSchema = userSettingSchema.extend({
  scope: settingsScopeSchema,
  data_type: settingDataTypeSchema,
});

// 设置查询参数验证
export const settingsQuerySchema = paginationSchema.extend({
  scope: settingsScopeSchema.optional(),
  organization_id: uuidSchema.optional(),
  category: z.string().optional(),
});

// 引导状态
export const onboardingStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'skipped']);

// 引导进度验证
export const onboardingProgressSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  organization_id: uuidSchema.optional(),
  template_id: uuidSchema,
  status: onboardingStatusSchema.default('not_started'),
  current_step_index: z.coerce.number().min(0).default(0),
  total_steps: z.coerce.number().min(1),
  completed_steps: z.coerce.number().min(0).default(0),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  estimated_completion_at: z.string().datetime().optional(),
  step_data: z.array(z.any()).default([]),
  skipped_steps: z.array(z.any()).default([]),
  failed_steps: z.array(z.any()).default([]),
  metadata: z.object({}).default({}),
});

// 引导进度更新验证
export const onboardingProgressUpdateSchema = z.object({
  template_id: uuidSchema.optional(),
  status: onboardingStatusSchema.optional(),
  current_step_index: z.coerce.number().min(0).optional(),
  completed_steps: z.coerce.number().min(0).optional(),
  step_data: z.array(z.any()).optional(),
  skipped_steps: z.array(z.any()).optional(),
  failed_steps: z.array(z.any()).optional(),
});

// 引导进度查询参数验证
export const onboardingProgressQuerySchema = paginationSchema.extend({
  template_id: uuidSchema.optional(),
  status: onboardingStatusSchema.optional(),
});

// ==================== 自学习者验证模式 ====================

// 难度级别
export const difficultyLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);

// 收藏类型
export const favoriteTypeSchema = z.enum(['course', 'class', 'chapter', 'component']);

// 活动类型
export const activityTypeSchema = z.enum([
  'view_course', 'complete_chapter', 'complete_component',
  'start_learning_session', 'end_learning_session', 'add_to_favorites',
  'create_pathway', 'update_pathway', 'achieve_milestone',
  'receive_achievement', 'update_progress'
]);

// 学习路径验证
export const selfLearnerPathwaySchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  difficulty_level: difficultyLevelSchema,
  estimated_duration_hours: z.coerce.number().min(1).max(1000),
  is_public: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

// 学习路径更新验证
export const selfLearnerPathwayUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  difficulty_level: difficultyLevelSchema.optional(),
  estimated_duration_hours: z.coerce.number().min(1).max(1000).optional(),
  is_public: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// 学习路径查询参数验证
export const selfLearnerPathwaysQuerySchema = paginationSchema.extend({
  is_public: z.coerce.boolean().optional(),
  difficulty_level: difficultyLevelSchema.optional(),
  user_id: uuidSchema.optional(),
});

// 收藏验证
export const selfLearnerFavoriteSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  course_id: uuidSchema.optional(),
  class_id: uuidSchema.optional(),
  chapter_id: uuidSchema.optional(),
  component_id: uuidSchema.optional(),
  favorite_type: favoriteTypeSchema,
  notes: z.string().max(500).optional(),
}).refine((data) => {
  // 确保至少有一个ID字段
  return data.course_id || data.class_id || data.chapter_id || data.component_id;
}, {
  message: '至少需要提供一个ID字段（course_id, class_id, chapter_id, component_id）',
});

// 收藏创建验证
export const selfLearnerFavoriteCreateSchema = selfLearnerFavoriteSchema.extend({
  user_id: uuidSchema.optional(),
});

// 收藏查询参数验证
export const selfLearnerFavoritesQuerySchema = paginationSchema.extend({
  favorite_type: favoriteTypeSchema.optional(),
});

// 活动记录验证
export const selfLearnerActivitySchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  pathway_id: uuidSchema.optional(),
  activity_type: activityTypeSchema,
  metadata: z.object({}).default({}),
  duration_minutes: z.coerce.number().min(0).optional(),
});

// ==================== 批量操作验证模式 ====================

// 批量设置更新验证
export const batchUserSettingUpdateSchema = z.object({
  settings: z.array(userSettingUpdateSchema).min(1).max(50),
});

// 批量删除验证
export const batchDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
});

// ==================== 搜索验证模式 ====================

// 搜索查询验证
export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.array(filterSchema).optional(),
  sort: z.array(sortSchema).optional(),
  pagination: paginationSchema.optional(),
});

// ==================== 验证错误处理 ====================

// 验证错误接口
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// 验证结果接口
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

// 验证帮助函数
export function parseWithValidation<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    success: false,
    data: undefined,
    errors,
  };
}

// 通用验证装饰器
export function validateRequest<T>(
  schema: z.ZodSchema<T>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: Request, ...args: any[]) {
      try {
        let body: any = {};

        // 根据HTTP方法获取请求数据
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          body = await req.json();
        } else if (req.method === 'GET' || req.method === 'DELETE') {
          const url = new URL(req.url);
          const searchParams = Object.fromEntries(url.searchParams.entries());
          body = searchParams;
        }

        const validation = parseWithValidation(schema, body);

        if (!validation.success) {
          return Response.json({
            error: 'Validation failed',
            details: validation.errors,
          }, { status: 400 });
        }

        // 将验证后的数据传递给原始方法
        return await originalMethod.call(this, req, validation.data, ...args);
      } catch (error) {
        return Response.json({
          error: 'Invalid request format',
          details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 400 });
      }
    };

    return descriptor;
  };
}