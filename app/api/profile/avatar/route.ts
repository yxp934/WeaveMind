import { NextRequest } from 'next/server';
import { Buffer } from 'buffer';
import {
  createErrorResponse,
  createSuccessResponse,
  logApiError,
  logApiRequest,
  validateAuth,
} from '@/lib/utils/api';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    logApiRequest(request);

    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user } = authResult;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return createErrorResponse('Missing avatar file', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return createErrorResponse('Unsupported file type', 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return createErrorResponse('File exceeds 1MB limit', 400);
    }

    const fileExtension = file.name.split('.').pop() || 'png';
    const filePath = `users/${user.id}/avatar-${Date.now()}.${fileExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(filePath, buffer, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return createErrorResponse(uploadError.message, 500);
    }

    const { data: publicUrlData } = admin.storage.from('avatars').getPublicUrl(filePath);

    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        avatar_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      return createErrorResponse(profileError.message, 500);
    }

    return createSuccessResponse({
      avatar_url: publicUrlData.publicUrl,
      path: filePath,
    });
  } catch (error) {
    logApiError(request, error, undefined, 'POST /api/profile/avatar');
    return createErrorResponse('Internal server error', 500);
  }
}
