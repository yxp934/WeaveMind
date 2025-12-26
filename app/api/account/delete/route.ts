import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  logApiError,
  logApiRequest,
  validateAuth,
} from '@/lib/utils/api';
import { createAdminClient } from '@/lib/supabase/admin';

const deleteSchema = z.object({
  confirm: z.literal(true),
});

export async function POST(request: NextRequest) {
  try {
    logApiRequest(request);

    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse('Confirmation required', 400, validation.error.issues);
    }

    const { user } = authResult;
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({ success: true });
  } catch (error) {
    logApiError(request, error, undefined, 'POST /api/account/delete');
    return createErrorResponse('Internal server error', 500);
  }
}
