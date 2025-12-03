import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  console.log('[MIDDLEWARE] Path:', pathname, 'User:', user?.id)

  // Protected routes: require authentication for teacher and student areas
  if (!user && (
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/student')
  )) {
    console.log('[MIDDLEWARE] No user, redirecting to /auth/login')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Enforce single-role accounts (teacher vs student)
  if (user && (
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/student') ||
    pathname === '/role-select'
  )) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const url = request.nextUrl.clone()

    // If no role yet, force the user through /role-select
    if (!profile || !profile.role) {
      if (pathname !== '/role-select' && !pathname.startsWith('/auth')) {
        url.pathname = '/role-select'
        return NextResponse.redirect(url)
      }
    } else {
      // Role is fixed; prevent crossing between teacher and student areas
      if (pathname.startsWith('/teacher') && profile.role !== 'teacher') {
        url.pathname = '/student'
        return NextResponse.redirect(url)
      }
      // Allow teachers to preview student course pages, but prevent students from accessing teacher pages
      const isTeacherPreviewingCourse = pathname.startsWith('/student/courses/') && profile.role === 'teacher'
      if (pathname.startsWith('/student') && profile.role !== 'student' && !isTeacherPreviewingCourse) {
        url.pathname = '/teacher'
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

