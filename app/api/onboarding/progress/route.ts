// 引导进度管理API端点
// GET /api/onboarding/progress - 获取用户引导进度
// PUT /api/onboarding/progress - 更新引导步骤进度

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
  onboardingProgressQuerySchema,
  onboardingProgressUpdateSchema,
  parseWithValidation,
} from '@/lib/validators/api';
import { OnboardingProgress } from '@/lib/types/api';

/**
 * GET /api/onboarding/progress
 * 获取用户引导进度
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
    const validation = parseWithValidation(onboardingProgressQuerySchema, queryParams);

    if (!validation.success) {
      return createErrorResponse('Invalid query parameters', 400, validation.errors);
    }

    const { limit, offset, template_id, status } = validation.data!;
    const { limit: validatedLimit, offset: validatedOffset } = validatePaginationParams({ limit, offset });

    // 构建查询
    let query = supabase
      .from('onboarding_progress')
      .select(`
        id,
        user_id,
        organization_id,
        template_id,
        status,
        current_step_index,
        total_steps,
        completed_steps,
        started_at,
        completed_at,
        estimated_completion_at,
        last_activity_at,
        step_data,
        skipped_steps,
        failed_steps,
        completion_percentage,
        user_agent,
        ip_address,
        created_at,
        updated_at,
        created_by,
        metadata,
        onboarding_templates!inner(
          id,
          name,
          description,
          target_roles,
          estimated_duration_minutes
        )
      `);

    // 应用过滤器 - 只返回当前用户的进度
    const filters: Record<string, any> = {
      user_id: user.id,
    };

    if (template_id) {
      filters.template_id = template_id;
    }

    if (status) {
      filters.status = status;
    }

    query = buildFilterQuery(query, filters);
    query = buildPaginationQuery(query, validatedLimit, validatedOffset);
    query = buildOrderQuery(query, 'updated_at', 'desc');

    // 执行查询
    const { data: progress, error, count } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    // 如果只有一个结果且没有分页参数，返回单个对象
    if (!limit && !offset && progress && progress.length === 1) {
      return createSuccessResponse(progress[0]);
    }

    return createSuccessResponse({
      progress: progress as OnboardingProgress[],
      pagination: {
        total: count || 0,
        limit: validatedLimit,
        offset: validatedOffset,
        has_more: (count || 0) > validatedOffset + validatedLimit,
      },
    });

  } catch (error) {
    logApiError(request, error, user?.id, 'GET /api/onboarding/progress');
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * PUT /api/onboarding/progress
 * 更新引导步骤进度
 */
export async function PUT(request: NextRequest) {
  try {
    logApiRequest(request);

    // 验证认证
    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;

    // 解析请求体
    const body = await request.json();

    // 验证请求数据
    const validation = parseWithValidation(onboardingProgressUpdateSchema, body);

    if (!validation.success) {
      return createErrorResponse('Invalid request body', 400, validation.errors);
    }

    const updateData = validation.data!;

    // 获取或创建引导进度记录
    let existingProgress = null;

    if (updateData.template_id) {
      // 查找现有的引导进度
      const { data: progress, error: findError } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('template_id', updateData.template_id)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        return handleSupabaseError(findError);
      }

      existingProgress = progress;
    }

    const now = new Date().toISOString();
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 准备更新数据
    const dataToUpdate: any = {
      updated_at: now,
      last_activity_at: now,
      user_agent: userAgent,
      ip_address: clientIP,
    };

    // 添加提供的更新字段
    if (updateData.template_id) dataToUpdate.template_id = updateData.template_id;
    if (updateData.status) dataToUpdate.status = updateData.status;
    if (updateData.current_step_index !== undefined) dataToUpdate.current_step_index = updateData.current_step_index;
    if (updateData.completed_steps !== undefined) dataToUpdate.completed_steps = updateData.completed_steps;
    if (updateData.step_data) dataToUpdate.step_data = updateData.step_data;
    if (updateData.skipped_steps) dataToUpdate.skipped_steps = updateData.skipped_steps;
    if (updateData.failed_steps) dataToUpdate.failed_steps = updateData.failed_steps;

    let result;

    if (existingProgress) {
      // 更新现有记录

      // 如果状态变为已完成，设置完成时间
      if (updateData.status === 'completed' && existingProgress.status !== 'completed') {
        dataToUpdate.completed_at = now;
      }

      // 如果状态从未开始变为进行中，设置开始时间
      if (updateData.status === 'in_progress' && existingProgress.status === 'not_started') {
        dataToUpdate.started_at = now;
      }

      const { data, error: updateError } = await supabase
        .from('onboarding_progress')
        .update(dataToUpdate)
        .eq('id', existingProgress.id)
        .select(`
          *,
          onboarding_templates(
            id,
            name,
            description,
            target_roles,
            estimated_duration_minutes
          )
        `)
        .single();

      if (updateError) {
        return handleSupabaseError(updateError);
      }

      result = data;

    } else {
      // 创建新记录
      const newProgressData = {
        user_id: user.id,
        template_id: updateData.template_id || '',
        status: updateData.status || 'not_started',
        current_step_index: updateData.current_step_index || 0,
        total_steps: 1, // 默认值，实际应该从模板获取
        completed_steps: updateData.completed_steps || 0,
        started_at: updateData.status === 'in_progress' ? now : null,
        completed_at: updateData.status === 'completed' ? now : null,
        step_data: updateData.step_data || [],
        skipped_steps: updateData.skipped_steps || [],
        failed_steps: updateData.failed_steps || [],
        user_agent: userAgent,
        ip_address: clientIP,
        metadata: {},
        created_by: user.id,
      };

      const { data, error: insertError } = await supabase
        .from('onboarding_progress')
        .insert([newProgressData])
        .select(`
          *,
          onboarding_templates(
            id,
            name,
            description,
            target_roles,
            estimated_duration_minutes
          )
        `)
        .single();

      if (insertError) {
        return handleSupabaseError(insertError);
      }

      result = data;
    }

    return createSuccessResponse(result);

  } catch (error) {
    logApiError(request, error, user?.id, 'PUT /api/onboarding/progress');
    return createErrorResponse('Internal server error', 500);
  }
}