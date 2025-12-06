// 自学习者收藏管理API端点
// GET /api/self-learner/favorites - 获取收藏的课程和班级
// POST /api/self-learner/favorites - 添加收藏

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createSuccessResponse,
  createErrorResponse,
  validateAuth,
  buildPaginationQuery,
  buildOrderQuery,
  buildFilterQuery,
  handleSupabaseError,
  logApiRequest,
  logApiError,
  validatePaginationParams,
} from '@/lib/utils/api';
import {
  selfLearnerFavoritesQuerySchema,
  selfLearnerFavoriteCreateSchema,
  parseWithValidation,
} from '@/lib/validators/api';
import { SelfLearnerFavorite } from '@/lib/types/api';

/**
 * GET /api/self-learner/favorites
 * 获取收藏的课程和班级
 */
export async function GET(request: NextRequest) {
  try {
    logApiRequest(request);

    // 验证认证
    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;

    // 验证和解析查询参数
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validation = parseWithValidation(selfLearnerFavoritesQuerySchema, queryParams);

    if (!validation.success) {
      return createErrorResponse('Invalid query parameters', 400, validation.errors);
    }

    const { limit, offset, favorite_type } = validation.data!;
    const { limit: validatedLimit, offset: validatedOffset } = validatePaginationParams({ limit, offset });

    // 构建查询
    let query = supabase
      .from('self_learner_favorites')
      .select(`
        id,
        user_id,
        course_id,
        class_id,
        chapter_id,
        component_id,
        favorite_type,
        notes,
        created_at,
        courses(
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_hours,
          thumbnail_url,
          profiles!courses_created_by_fkey(
            id,
            full_name
          )
        ),
        classes(
          id,
          name,
          description,
          organization_id,
          organizations(
            id,
            name
          )
        ),
        chapters(
          id,
          title,
          description,
          order_index,
          courses(
            id,
            title
          )
        ),
        components(
          id,
          title,
          content_type,
          description,
          chapters(
            id,
            title,
            courses(
              id,
              title
            )
          )
        )
      `);

    // 应用过滤器
    const filters: Record<string, any> = {
      user_id: user.id,
    };

    if (favorite_type) {
      filters.favorite_type = favorite_type;
    }

    query = buildFilterQuery(query, filters);
    query = buildPaginationQuery(query, validatedLimit, validatedOffset);
    query = buildOrderQuery(query, 'created_at', 'desc');

    // 执行查询
    const { data: favorites, error, count } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    // 处理数据，添加关联信息的便捷访问
    const processedFavorites = favorites?.map(favorite => {
      // 确定主要关联对象
      let primary_object = null;
      let primary_type = null;

      if (favorite.course_id && favorite.courses) {
        primary_object = favorite.courses;
        primary_type = 'course';
      } else if (favorite.class_id && favorite.classes) {
        primary_object = favorite.classes;
        primary_type = 'class';
      } else if (favorite.chapter_id && favorite.chapters) {
        primary_object = favorite.chapters;
        primary_type = 'chapter';
      } else if (favorite.component_id && favorite.components) {
        primary_object = favorite.components;
        primary_type = 'component';
      }

      return {
        ...favorite,
        primary_object,
        primary_type,
      };
    }) || [];

    return NextResponse.json({
      data: processedFavorites,
      pagination: {
        total: count || 0,
        limit: validatedLimit,
        offset: validatedOffset,
        has_more: (count || 0) > validatedOffset + validatedLimit,
      },
    });

  } catch (error) {
    logApiError(request, error, undefined, 'GET /api/self-learner/favorites');
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/self-learner/favorites
 * 添加收藏
 */
export async function POST(request: NextRequest) {
  try {
    logApiRequest(request);

    // 验证认证
    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;

    // 解析和验证请求体
    const body = await request.json();
    const validation = parseWithValidation(selfLearnerFavoriteCreateSchema, body);

    if (!validation.success) {
      return createErrorResponse('Invalid request body', 400, validation.errors);
    }

    const favoriteData = validation.data!;

    // 设置用户ID
    favoriteData.user_id = user.id;

    // 验证用户角色 - 确保只有自学习者可以添加收藏
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return handleSupabaseError(profileError);
    }

    if (profile.role !== 'self_learner') {
      return createErrorResponse('Only self-learners can add favorites', 403);
    }

    // 验证引用的资源是否存在
    const { data: referencedResource, error: resourceError } = await validateReferencedResource(
      supabase,
      favoriteData.course_id,
      favoriteData.class_id,
      favoriteData.chapter_id,
      favoriteData.component_id
    );

    if (resourceError) {
      return resourceError;
    }

    // 检查是否已经收藏
    const { data: existingFavorite, error: checkError } = await supabase
      .from('self_learner_favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', favoriteData.course_id || null)
      .eq('class_id', favoriteData.class_id || null)
      .eq('chapter_id', favoriteData.chapter_id || null)
      .eq('component_id', favoriteData.component_id || null)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return handleSupabaseError(checkError);
    }

    if (existingFavorite) {
      return createErrorResponse('Already favorited', 409, {
        existing_favorite_id: existingFavorite.id,
      });
    }

    // 创建收藏记录
    const { data: newFavorite, error: createError } = await supabase
      .from('self_learner_favorites')
      .insert([favoriteData])
      .select(`
        id,
        user_id,
        course_id,
        class_id,
        chapter_id,
        component_id,
        favorite_type,
        notes,
        created_at,
        courses(
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_hours,
          thumbnail_url,
          profiles!courses_created_by_fkey(
            id,
            full_name
          )
        ),
        classes(
          id,
          name,
          description,
          organization_id,
          organizations(
            id,
            name
          )
        ),
        chapters(
          id,
          title,
          description,
          order_index,
          courses(
            id,
            title
          )
        ),
        components(
          id,
          title,
          content_type,
          description,
          chapters(
            id,
            title,
            courses(
              id,
              title
            )
          )
        )
      `)
      .single();

    if (createError) {
      return handleSupabaseError(createError);
    }

    // 记录活动
    const { error: activityError } = await supabase
      .from('self_learner_activities')
      .insert([{
        user_id: user.id,
        activity_type: 'add_to_favorites',
        metadata: {
          favorite_id: newFavorite.id,
          favorite_type: newFavorite.favorite_type,
          resource_id: favoriteData.course_id || favoriteData.class_id || favoriteData.chapter_id || favoriteData.component_id,
          resource_type: favoriteData.favorite_type,
        },
      }]);

    if (activityError) {
      console.error('Failed to record activity:', activityError);
      // 不影响主要操作，只记录错误
    }

    // 处理返回数据
    let primary_object = null;
    let primary_type = null;

    if (newFavorite.course_id && newFavorite.courses) {
      primary_object = newFavorite.courses;
      primary_type = 'course';
    } else if (newFavorite.class_id && newFavorite.classes) {
      primary_object = newFavorite.classes;
      primary_type = 'class';
    } else if (newFavorite.chapter_id && newFavorite.chapters) {
      primary_object = newFavorite.chapters;
      primary_type = 'chapter';
    } else if (newFavorite.component_id && newFavorite.components) {
      primary_object = newFavorite.components;
      primary_type = 'component';
    }

    const responseData = {
      ...newFavorite,
      primary_object,
      primary_type,
    };

    return createSuccessResponse(responseData, 201);

  } catch (error) {
    logApiError(request, error, undefined, 'POST /api/self-learner/favorites');
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * 验证引用的资源是否存在
 */
async function validateReferencedResource(
  supabase: any,
  courseId?: string,
  classId?: string,
  chapterId?: string,
  componentId?: string
) {
  try {
    // 确保至少有一个ID
    if (!courseId && !classId && !chapterId && !componentId) {
      return { error: createErrorResponse('At least one resource ID must be provided', 400) };
    }

    // 验证课程
    if (courseId) {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      if (courseError) {
        if (courseError.code === 'PGRST116') {
          return { error: createErrorResponse('Course not found', 404) };
        }
        return { error: handleSupabaseError(courseError) };
      }

      return { data: course };
    }

    // 验证班级
    if (classId) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('id', classId)
        .single();

      if (classError) {
        if (classError.code === 'PGRST116') {
          return { error: createErrorResponse('Class not found', 404) };
        }
        return { error: handleSupabaseError(classError) };
      }

      return { data: classData };
    }

    // 验证章节
    if (chapterId) {
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .select('id, title')
        .eq('id', chapterId)
        .single();

      if (chapterError) {
        if (chapterError.code === 'PGRST116') {
          return { error: createErrorResponse('Chapter not found', 404) };
        }
        return { error: handleSupabaseError(chapterError) };
      }

      return { data: chapter };
    }

    // 验证组件
    if (componentId) {
      const { data: component, error: componentError } = await supabase
        .from('components')
        .select('id, title')
        .eq('id', componentId)
        .single();

      if (componentError) {
        if (componentError.code === 'PGRST116') {
          return { error: createErrorResponse('Component not found', 404) };
        }
        return { error: handleSupabaseError(componentError) };
      }

      return { data: component };
    }

    return { error: createErrorResponse('Invalid resource reference', 400) };

  } catch (error) {
    console.error('Resource validation error:', error);
    return { error: createErrorResponse('Failed to validate resource', 500) };
  }
}