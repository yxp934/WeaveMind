// 设置管理API端点
// GET /api/settings - 获取用户设置
// PUT /api/settings - 更新用户设置

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  validateAuth,
  validatePermission,
  buildPaginationQuery,
  buildOrderQuery,
  buildFilterQuery,
  handleSupabaseError,
  logApiRequest,
  logApiError,
  validatePaginationParams,
} from '@/lib/utils/api';
import {
  settingsQuerySchema,
  userSettingUpdateSchema,
  batchUserSettingUpdateSchema,
  parseWithValidation,
} from '@/lib/validators/api';
import { UserSetting } from '@/lib/types/api';

/**
 * GET /api/settings
 * 获取用户设置（支持组织和用户级别设置）
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
    const validation = parseWithValidation(settingsQuerySchema, queryParams);

    if (!validation.success) {
      return createErrorResponse('Invalid query parameters', 400, validation.errors);
    }

    const { limit, offset, scope, organization_id, category } = validation.data!;
    const { limit: validatedLimit, offset: validatedOffset } = validatePaginationParams({ limit, offset });

    // 构建查询
    let query = supabase
      .from('user_settings')
      .select(`
        id,
        user_id,
        organization_id,
        scope,
        setting_category,
        setting_key,
        setting_value,
        data_type,
        default_value,
        parent_setting_id,
        override_level,
        can_override,
        version,
        created_at,
        updated_at,
        updated_by,
        validation_schema,
        is_active,
        is_deleted,
        description,
        tags,
        metadata
      `);

    // 应用过滤器
    const filters: Record<string, any> = {
      is_deleted: false,
      is_active: true,
    };

    if (scope) {
      filters.scope = scope;
    }

    if (organization_id) {
      filters.organization_id = organization_id;
    }

    if (category) {
      filters.setting_category = category;
    }

    // 应用权限过滤
    if (scope === 'organization' && organization_id) {
      // 检查用户是否有权限查看组织设置
      const hasPermission = await validatePermission(
        supabase,
        user.id,
        organization_id,
        ['owner', 'teacher']
      );

      if (!hasPermission) {
        return createErrorResponse('Insufficient permissions', 403);
      }
    } else {
      // 只允许用户查看自己的设置
      filters.user_id = user.id;
    }

    query = buildFilterQuery(query, filters);
    query = buildPaginationQuery(query, validatedLimit, validatedOffset);
    query = buildOrderQuery(query, 'updated_at', 'desc');

    // 执行查询
    const { data: settings, error, count } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    return createPaginatedResponse(
      settings as UserSetting[],
      count || 0,
      validatedLimit,
      validatedOffset
    );

  } catch (error) {
    logApiError(request, error, undefined, 'GET /api/settings');
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * PUT /api/settings
 * 更新用户设置
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

    // 检查是否为批量更新
    if (Array.isArray(body.settings)) {
      // 批量更新
      const validation = parseWithValidation(batchUserSettingUpdateSchema, body);

      if (!validation.success) {
        return createErrorResponse('Invalid request body', 400, validation.errors);
      }

      const { settings: settingsToUpdate } = validation.data!;

      const results = [];
      const errors = [];

      // 处理每个设置更新
      for (const settingData of settingsToUpdate) {
        try {
          // 验证设置数据
          const settingValidation = parseWithValidation(userSettingUpdateSchema, settingData);

          if (!settingValidation.success) {
            errors.push({
              setting: settingData.setting_key,
              errors: settingValidation.errors,
            });
            continue;
          }

          const validatedSetting = settingValidation.data!;

          // 设置用户ID（如果未提供）
          if (!validatedSetting.user_id) {
            validatedSetting.user_id = user.id;
          }

          // 验证权限
          if (validatedSetting.scope === 'organization' && validatedSetting.organization_id) {
            const hasPermission = await validatePermission(
              supabase,
              user.id,
              validatedSetting.organization_id,
              ['owner', 'teacher']
            );

            if (!hasPermission) {
              errors.push({
                setting: validatedSetting.setting_key,
                error: 'Insufficient permissions for organization settings',
              });
              continue;
            }
          }

          // 如果是用户级别设置，确保只能修改自己的设置
          if (validatedSetting.scope === 'user' && validatedSetting.user_id !== user.id) {
            errors.push({
              setting: validatedSetting.setting_key,
              error: 'Cannot modify another user\'s settings',
            });
            continue;
          }

          // 准备更新数据
          const updateData = {
            ...validatedSetting,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          };

          let result;

          if (validatedSetting.id) {
            // 更新现有设置
            const { data, error: updateError } = await supabase
              .from('user_settings')
              .update(updateData)
              .eq('id', validatedSetting.id)
              .select()
              .single();

            if (updateError) {
              errors.push({
                setting: validatedSetting.setting_key,
                error: updateError.message,
              });
              continue;
            }

            result = data;
          } else {
            // 创建新设置
            const { data, error: insertError } = await supabase
              .from('user_settings')
              .insert([updateData])
              .select()
              .single();

            if (insertError) {
              errors.push({
                setting: validatedSetting.setting_key,
                error: insertError.message,
              });
              continue;
            }

            result = data;
          }

          results.push(result);

        } catch (error) {
          errors.push({
            setting: settingData.setting_key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return createSuccessResponse({
        updated_settings: results,
        errors: errors.length > 0 ? errors : undefined,
        success_count: results.length,
        error_count: errors.length,
      });

    } else {
      // 单个设置更新
      const validation = parseWithValidation(userSettingUpdateSchema, body);

      if (!validation.success) {
        return createErrorResponse('Invalid request body', 400, validation.errors);
      }

      const settingData = validation.data!;

      // 设置用户ID（如果未提供）
      if (!settingData.user_id) {
        settingData.user_id = user.id;
      }

      // 验证权限
      if (settingData.scope === 'organization' && settingData.organization_id) {
        const hasPermission = await validatePermission(
          supabase,
          user.id,
          settingData.organization_id,
          ['owner', 'teacher']
        );

        if (!hasPermission) {
          return createErrorResponse('Insufficient permissions for organization settings', 403);
        }
      }

      // 如果是用户级别设置，确保只能修改自己的设置
      if (settingData.scope === 'user' && settingData.user_id !== user.id) {
        return createErrorResponse('Cannot modify another user\'s settings', 403);
      }

      // 准备更新数据
      const updateData = {
        ...settingData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (settingData.id) {
        // 更新现有设置
        const { data, error: updateError } = await supabase
          .from('user_settings')
          .update(updateData)
          .eq('id', settingData.id)
          .select()
          .single();

        if (updateError) {
          return handleSupabaseError(updateError);
        }

        result = data;
      } else {
        // 创建新设置
        const { data, error: insertError } = await supabase
          .from('user_settings')
          .insert([updateData])
          .select()
          .single();

        if (insertError) {
          return handleSupabaseError(insertError);
        }

        result = data;
      }

      return createSuccessResponse(result);
    }

  } catch (error) {
    logApiError(request, error, undefined, 'PUT /api/settings');
    return createErrorResponse('Internal server error', 500);
  }
}