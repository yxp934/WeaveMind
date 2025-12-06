// 自学习者学习路径管理API端点
// GET /api/self-learner/pathways - 获取用户学习路径列表
// POST /api/self-learner/pathways - 创建新的学习路径

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
  selfLearnerPathwaysQuerySchema,
  selfLearnerPathwaySchema,
  parseWithValidation,
} from '@/lib/validators/api';
import { SelfLearnerPathway } from '@/lib/types/api';

/**
 * GET /api/self-learner/pathways
 * 获取用户学习路径列表
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
    const validation = parseWithValidation(selfLearnerPathwaysQuerySchema, queryParams);

    if (!validation.success) {
      return createErrorResponse('Invalid query parameters', 400, validation.errors);
    }

    const { limit, offset, is_public, difficulty_level, user_id } = validation.data!;
    const { limit: validatedLimit, offset: validatedOffset } = validatePaginationParams({ limit, offset });

    // 构建查询
    let query = supabase
      .from('self_learner_pathways')
      .select(`
        id,
        user_id,
        title,
        description,
        difficulty_level,
        estimated_duration_hours,
        is_public,
        tags,
        created_at,
        updated_at,
        profiles!self_learner_pathways_user_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        self_learner_pathway_progress(
          progress_percentage,
          completed_items,
          total_items,
          last_activity_at
        )
      `);

    // 应用过滤器
    const filters: Record<string, any> = {};

    // 如果指定了用户ID，只返回该用户的学习路径
    if (user_id) {
      if (user_id === user.id) {
        // 用户可以查看自己的所有路径（包括私人的）
        filters.user_id = user_id;
      } else {
        // 只能查看其他用户的公开路径
        filters.user_id = user_id;
        filters.is_public = true;
      }
    } else {
      // 没有指定用户ID，返回当前用户的路径
      filters.user_id = user.id;
    }

    // 公开路径查询
    if (is_public !== undefined) {
      filters.is_public = is_public;
    }

    // 难度级别过滤
    if (difficulty_level) {
      filters.difficulty_level = difficulty_level;
    }

    query = buildFilterQuery(query, filters);
    query = buildPaginationQuery(query, validatedLimit, validatedOffset);
    query = buildOrderQuery(query, 'updated_at', 'desc');

    // 执行查询
    const { data: pathways, error, count } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    // 如果没有指定用户ID，只返回当前用户的结果
    if (!user_id) {
      return NextResponse.json({
        data: pathways || [],
        pagination: {
          total: count || 0,
          limit: validatedLimit,
          offset: validatedOffset,
          has_more: (count || 0) > validatedOffset + validatedLimit,
        },
      });
    }

    // 如果指定了用户ID，需要合并公开路径
    let publicPathways: any[] = [];

    if (user_id && user_id !== user.id) {
      // 查询公开路径
      const { data: publicData, error: publicError } = await supabase
        .from('self_learner_pathways')
        .select(`
          id,
          user_id,
          title,
          description,
          difficulty_level,
          estimated_duration_hours,
          is_public,
          tags,
          created_at,
          updated_at,
          profiles!self_learner_pathways_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user_id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .range(validatedOffset, validatedOffset + validatedLimit - 1);

      if (publicError) {
        return handleSupabaseError(publicError);
      }

      publicPathways = publicData || [];
    }

    return NextResponse.json({
      data: pathways?.length ? pathways : publicPathways,
      pagination: {
        total: count || publicPathways.length || 0,
        limit: validatedLimit,
        offset: validatedOffset,
        has_more: (count || publicPathways.length) > validatedOffset + validatedLimit,
      },
    });

  } catch (error) {
    logApiError(request, error, undefined, 'GET /api/self-learner/pathways');
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/self-learner/pathways
 * 创建新的学习路径
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
    const validation = parseWithValidation(selfLearnerPathwaySchema, body);

    if (!validation.success) {
      return createErrorResponse('Invalid request body', 400, validation.errors);
    }

    const pathwayData = validation.data!;

    // 设置用户ID
    pathwayData.user_id = user.id;

    // 验证用户角色 - 确保只有自学习者可以创建学习路径
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return handleSupabaseError(profileError);
    }

    if (profile.role !== 'self_learner') {
      return createErrorResponse('Only self-learners can create learning pathways', 403);
    }

    // 创建学习路径
    const { data: newPathway, error: createError } = await supabase
      .from('self_learner_pathways')
      .insert([pathwayData])
      .select(`
        id,
        user_id,
        title,
        description,
        difficulty_level,
        estimated_duration_hours,
        is_public,
        tags,
        created_at,
        updated_at,
        profiles!self_learner_pathways_user_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (createError) {
      return handleSupabaseError(createError);
    }

    // 创建初始进度记录
    const { error: progressError } = await supabase
      .from('self_learner_pathway_progress')
      .insert([{
        pathway_id: newPathway.id,
        user_id: user.id,
        total_items: 0,
        completed_items: 0,
        progress_percentage: 0.0,
        total_estimated_minutes: pathwayData.estimated_duration_hours * 60,
        actual_learning_minutes: 0,
      }]);

    if (progressError) {
      // 如果进度记录创建失败，删除已创建的学习路径
      await supabase.from('self_learner_pathways').delete().eq('id', newPathway.id);
      return handleSupabaseError(progressError);
    }

    // 记录活动
    const { error: activityError } = await supabase
      .from('self_learner_activities')
      .insert([{
        user_id: user.id,
        pathway_id: newPathway.id,
        activity_type: 'create_pathway',
        metadata: {
          pathway_title: newPathway.title,
          difficulty_level: newPathway.difficulty_level,
        },
      }]);

    if (activityError) {
      console.error('Failed to record activity:', activityError);
      // 不影响主要操作，只记录错误
    }

    return createSuccessResponse(newPathway, 201);

  } catch (error) {
    logApiError(request, error, undefined, 'POST /api/self-learner/pathways');
    return createErrorResponse('Internal server error', 500);
  }
}