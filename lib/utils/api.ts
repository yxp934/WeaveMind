// 通用API工具函数
// WeaveMind LMS API端点通用工具

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse, PaginatedResponse } from '@/lib/types/api';

// ==================== 基础响应函数 ====================

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { error, details },
    { status }
  );
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): NextResponse<PaginatedResponse<T>> {
  const hasMore = offset + limit < total;

  return NextResponse.json({
    data,
    pagination: {
      limit,
      offset,
      total,
      has_more: hasMore,
    },
  });
}

// ==================== 认证和授权 ====================

/**
 * 验证用户认证状态
 */
export async function validateAuth(request: NextRequest): Promise<{ user: any; supabase: any } | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { user, supabase };
  } catch (error) {
    console.error('Auth validation error:', error);
    return null;
  }
}

/**
 * 验证用户权限
 */
export async function validatePermission(
  supabase: any,
  userId: string,
  organizationId?: string,
  requiredRoles: string[] = ['owner', 'teacher', 'student']
): Promise<boolean> {
  try {
    if (!organizationId) {
      // 如果没有组织ID，检查用户角色
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      return profile ? requiredRoles.includes(profile.role) : false;
    }

    // 检查组织成员权限
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    return orgMember ? requiredRoles.includes(orgMember.role) : false;
  } catch (error) {
    console.error('Permission validation error:', error);
    return false;
  }
}

// ==================== 数据查询工具 ====================

/**
 * 构建分页查询
 */
export function buildPaginationQuery(
  query: any,
  limit: number = 10,
  offset: number = 0
) {
  return query
    .range(offset, offset + limit - 1);
}

/**
 * 构建排序查询
 */
export function buildOrderQuery(
  query: any,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'asc'
) {
  if (sortBy) {
    return query.order(sortBy, { ascending: sortOrder === 'asc' });
  }
  return query;
}

/**
 * 构建过滤查询
 */
export function buildFilterQuery(
  query: any,
  filters: Record<string, any>
) {
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query = query.eq(key, value);
    }
  });
  return query;
}

// ==================== 错误处理 ====================

/**
 * 处理Supabase错误
 */
export function handleSupabaseError(error: any): NextResponse {
  console.error('Supabase error:', error);

  if (error.code === 'PGRST116') {
    // 记录不存在
    return createErrorResponse('Record not found', 404);
  }

  if (error.code === '23505') {
    // 唯一约束冲突
    return createErrorResponse('Duplicate entry', 409);
  }

  if (error.code === '23503') {
    // 外键约束冲突
    return createErrorResponse('Referenced record not found', 400);
  }

  if (error.code === '42501') {
    // 权限不足
    return createErrorResponse('Insufficient permissions', 403);
  }

  // 默认服务器错误
  return createErrorResponse('Database operation failed', 500);
}

/**
 * 处理验证错误
 */
export function handleValidationError(errors: any[]): NextResponse {
  const errorMessages = errors.map(err => `${err.field}: ${err.message}`).join(', ');
  return createErrorResponse(`Validation failed: ${errorMessages}`, 400);
}

/**
 * 处理通用错误
 */
export function handleGenericError(error: any, context: string): NextResponse {
  console.error(`${context} error:`, error);
  return createErrorResponse(
    'Internal server error',
    500,
    process.env.NODE_ENV === 'development' ? error.message : undefined
  );
}

// ==================== 数据转换 ====================

/**
 * 转换数据库记录为API响应格式
 */
export function transformRecord<T extends Record<string, any>>(
  record: T,
  transformMap?: Record<string, string>
): T {
  if (!transformMap) return record;

  const transformed = { ...record };
  Object.entries(transformMap).forEach(([dbField, apiField]) => {
    if (record[dbField] !== undefined) {
      transformed[apiField] = record[dbField];
      delete transformed[dbField];
    }
  });

  return transformed;
}

/**
 * 转换数据库记录数组为API响应格式
 */
export function transformRecords<T extends Record<string, any>>(
  records: T[],
  transformMap?: Record<string, string>
): T[] {
  return records.map(record => transformRecord(record, transformMap));
}

// ==================== 工具函数 ====================

/**
 * 生成UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 获取客户端IP地址
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * 获取用户代理
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * 验证UUID格式
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 清理和验证分页参数
 */
export function validatePaginationParams(params: {
  limit?: string | number;
  offset?: string | number;
}) {
  const limit = Math.min(Math.max(parseInt(String(params.limit || '10')), 1), 100);
  const offset = Math.max(parseInt(String(params.offset || '0')), 0);

  return { limit, offset };
}

/**
 * 构建搜索查询
 */
export function buildSearchQuery(
  query: any,
  searchFields: string[],
  searchTerm: string
) {
  if (!searchTerm) return query;

  const searchPattern = `%${searchTerm.toLowerCase()}%`;

  return query.or(
    searchFields.map(field =>
      `${field}.ilike.${searchPattern}`
    ).join(',')
  );
}

// ==================== 日志记录 ====================

/**
 * 记录API请求
 */
export function logApiRequest(
  request: NextRequest,
  userId?: string,
  action?: string,
  details?: any
) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userId,
    action,
    details,
    ip: getClientIP(request),
    userAgent: getUserAgent(request),
  };

  console.log('API Request:', logData);
}

/**
 * 记录API错误
 */
export function logApiError(
  request: NextRequest,
  error: any,
  userId?: string,
  context?: string
) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userId,
    context,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    ip: getClientIP(request),
    userAgent: getUserAgent(request),
  };

  console.error('API Error:', logData);
}