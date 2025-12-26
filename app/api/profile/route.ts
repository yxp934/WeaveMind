import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createErrorResponse,
  createSuccessResponse,
  logApiError,
  logApiRequest,
  validateAuth,
} from '@/lib/utils/api';

const profileUpdateSchema = z.object({
  full_name: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  organization: z.string().max(200).nullable().optional(),
  department: z.string().max(200).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  email: z.string().email().optional(),
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export async function GET(request: NextRequest) {
  try {
    logApiRequest(request);

    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, phone, organization, department, title, bio')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return createErrorResponse(error.message, 500);
    }

    return createSuccessResponse({
      profile: profile || {
        full_name: null,
        avatar_url: null,
        phone: null,
        organization: null,
        department: null,
        title: null,
        bio: null,
      },
      email: user.email || null,
      user_id: user.id,
    });
  } catch (error) {
    logApiError(request, error, undefined, 'GET /api/profile');
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    logApiRequest(request);

    const authResult = await validateAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authResult;
    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse('Invalid request body', 400, validation.error.issues);
    }

    const updates = validation.data as ProfileUpdate;

    const profilePayload = {
      id: user.id,
      full_name: updates.full_name ?? null,
      avatar_url: updates.avatar_url ?? null,
      phone: updates.phone ?? null,
      organization: updates.organization ?? null,
      department: updates.department ?? null,
      title: updates.title ?? null,
      bio: updates.bio ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('full_name, avatar_url, phone, organization, department, title, bio')
      .single();

    if (profileError) {
      return createErrorResponse(profileError.message, 500);
    }

    if (updates.email && updates.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: updates.email,
      });

      if (emailError) {
        return createErrorResponse(emailError.message, 400);
      }
    }

    return createSuccessResponse({
      profile,
      email: updates.email || user.email || null,
      user_id: user.id,
    });
  } catch (error) {
    logApiError(request, error, undefined, 'PUT /api/profile');
    return createErrorResponse('Internal server error', 500);
  }
}
