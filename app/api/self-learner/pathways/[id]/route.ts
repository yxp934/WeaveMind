// 自学习者学习路径动态路由
// PUT /api/self-learner/pathways/[id] - 更新学习路径
// DELETE /api/self-learner/pathways/[id] - 删除学习路径

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createSuccessResponse,
  createErrorResponse,
  validateAuth,
  handleSupabaseError,
  logApiRequest,
  logApiError,
} from '@/lib/utils/api';
import {
  selfLearnerPathwayUpdateSchema,
  parseWithValidation,
} from '@/lib/validators/api';
import { SelfLearnerPathway } from '@/lib/types/api';

/**
 * PUT /api/self-learner/pathways/[id]
 * 更新学习路径
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logApiRequest(request);

    // 验证认证
    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;
    const pathwayId = params.id;

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(pathwayId)) {
      return createErrorResponse('Invalid pathway ID format', 400);
    }

    // 解析和验证请求体
    const body = await request.json();
    const validation = parseWithValidation(selfLearnerPathwayUpdateSchema, body);

    if (!validation.success) {
      return createErrorResponse('Invalid request body', 400, validation.errors);
    }

    const updateData = validation.data!;

    // 首先验证路径是否存在且属于当前用户
    const { data: existingPathway, error: fetchError } = await supabase
      .from('self_learner_pathways')
      .select('*')
      .eq('id', pathwayId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse('Learning pathway not found', 404);
      }
      return handleSupabaseError(fetchError);
    }

    // 检查权限 - 只有创建者可以更新
    if (existingPathway.user_id !== user.id) {
      return createErrorResponse('You can only update your own learning pathways', 403);
    }

    // 验证用户角色
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return handleSupabaseError(profileError);
    }

    if (profile.role !== 'self_learner') {
      return createErrorResponse('Only self-learners can update learning pathways', 403);
    }

    // 检查是否尝试修改不可变的字段
    const immutableFields = ['user_id', 'created_at'];
    const attemptedImmutableFields = Object.keys(updateData).filter(field =>
      immutableFields.includes(field)
    );

    if (attemptedImmutableFields.length > 0) {
      return createErrorResponse(
        `Cannot modify immutable fields: ${attemptedImmutableFields.join(', ')}`,
        400
      );
    }

    // 准备更新数据
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // 更新学习路径
    const { data: updatedPathway, error: updateError } = await supabase
      .from('self_learner_pathways')
      .update(dataToUpdate)
      .eq('id', pathwayId)
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
      `)
      .single();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    // 记录活动
    const { error: activityError } = await supabase
      .from('self_learner_activities')
      .insert([{
        user_id: user.id,
        pathway_id: pathwayId,
        activity_type: 'update_pathway',
        metadata: {
          pathway_title: updatedPathway.title,
          changes: updateData,
        },
      }]);

    if (activityError) {
      console.error('Failed to record activity:', activityError);
      // 不影响主要操作，只记录错误
    }

    return createSuccessResponse(updatedPathway);

  } catch (error) {
    logApiError(request, error, undefined, 'PUT /api/self-learner/pathways/[id]');
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * DELETE /api/self-learner/pathways/[id]
 * 删除学习路径
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logApiRequest(request);

    // 验证认证
    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;
    const pathwayId = params.id;

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(pathwayId)) {
      return createErrorResponse('Invalid pathway ID format', 400);
    }

    // 首先验证路径是否存在且属于当前用户
    const { data: existingPathway, error: fetchError } = await supabase
      .from('self_learner_pathways')
      .select('*')
      .eq('id', pathwayId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createErrorResponse('Learning pathway not found', 404);
      }
      return handleSupabaseError(fetchError);
    }

    // 检查权限 - 只有创建者可以删除
    if (existingPathway.user_id !== user.id) {
      return createErrorResponse('You can only delete your own learning pathways', 403);
    }

    // 验证用户角色
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return handleSupabaseError(profileError);
    }

    if (profile.role !== 'self_learner') {
      return createErrorResponse('Only self-learners can delete learning pathways', 403);
    }

    // 开始事务删除操作
    try {
      // 1. 删除相关活动记录
      await supabase
        .from('self_learner_activities')
        .delete()
        .eq('pathway_id', pathwayId);

      // 2. 删除进度记录
      await supabase
        .from('self_learner_pathway_progress')
        .delete()
        .eq('pathway_id', pathwayId);

      // 3. 删除路径项目
      await supabase
        .from('self_learner_pathway_items')
        .delete()
        .eq('pathway_id', pathwayId);

      // 4. 删除学习路径本身
      const { error: deleteError } = await supabase
        .from('self_learner_pathways')
        .delete()
        .eq('id', pathwayId);

      if (deleteError) {
        return handleSupabaseError(deleteError);
      }

      return createSuccessResponse({
        message: 'Learning pathway deleted successfully',
        deleted_pathway: {
          id: pathwayId,
          title: existingPathway.title,
        },
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return createErrorResponse('Failed to delete learning pathway', 500);
    }

  } catch (error) {
    logApiError(request, error, undefined, 'DELETE /api/self-learner/pathways/[id]');
    return createErrorResponse('Internal server error', 500);
  }
}