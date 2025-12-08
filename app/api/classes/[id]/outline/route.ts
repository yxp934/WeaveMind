import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/classes/[id]/outline
 * Fetch the outline for a class
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user has access to this class
    const { data: classMember } = await supabase
      .from("class_members")
      .select("role")
      .eq("class_id", id)
      .eq("user_id", user.id)
      .single()

    if (!classMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Fetch outline for this class (class-based outline)
    const { data: classOutline, error } = await supabase
      .from("course_outlines")
      .select("*")
      .eq("class_id", id)
      .eq("created_by", user.id)
      .single()

    // Also try to fetch course-based outline if class-based doesn't exist
    let courseOutline = null
    if (!classOutline) {
      const { data: courses } = await supabase
        .from("courses")
        .select("id")
        .eq("class_id", id)
        .eq("created_by", user.id)

      if (courses && courses.length > 0) {
        const { data: courseBasedOutline } = await supabase
          .from("course_outlines")
          .select("*")
          .eq("course_id", courses[0].id)
          .eq("created_by", user.id)
          .single()

        courseOutline = courseBasedOutline
      }
    }

    // Return the class-based outline if available, otherwise course-based
    const outline = classOutline || courseOutline

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("Error fetching class outline:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      outline: outline || null,
      outline_type: classOutline ? "class_based" : (courseOutline ? "course_based" : null)
    })
  } catch (error: any) {
    console.error("Error in GET /api/classes/[id]/outline:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/classes/[id]/outline
 * Save or update the outline for a class
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { requirements, chapters, outline_type = "class_based", course_id } = body

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user has access to this class and is a teacher
    const { data: classMember } = await supabase
      .from("class_members")
      .select("role")
      .eq("class_id", id)
      .eq("user_id", user.id)
      .single()

    if (!classMember || classMember.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let result

    if (outline_type === "class_based") {
      // Check if class-based outline already exists
      const { data: existingOutline } = await supabase
        .from("course_outlines")
        .select("id")
        .eq("class_id", id)
        .eq("created_by", user.id)
        .single()

      if (existingOutline) {
        // Update existing class-based outline
        const { data, error } = await supabase
          .from("course_outlines")
          .update({
            requirements,
            chapters,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOutline.id)
          .select()
          .single()

        if (error) {
          console.error("Error updating class outline:", error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        result = data
      } else {
        // Create new class-based outline
        const { data, error } = await supabase
          .from("course_outlines")
          .insert({
            class_id: id,
            requirements,
            chapters,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating class outline:", error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        result = data
      }
    } else if (outline_type === "course_based" && course_id) {
      // Verify the course belongs to this class and user
      const { data: course } = await supabase
        .from("courses")
        .select("id")
        .eq("id", course_id)
        .eq("class_id", id)
        .eq("created_by", user.id)
        .single()

      if (!course) {
        return NextResponse.json({ error: "Course not found or access denied" }, { status: 404 })
      }

      // Check if course-based outline already exists
      const { data: existingOutline } = await supabase
        .from("course_outlines")
        .select("id")
        .eq("course_id", course_id)
        .eq("created_by", user.id)
        .single()

      if (existingOutline) {
        // Update existing course-based outline
        const { data, error } = await supabase
          .from("course_outlines")
          .update({
            requirements,
            chapters,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOutline.id)
          .select()
          .single()

        if (error) {
          console.error("Error updating course outline:", error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        result = data
      } else {
        // Create new course-based outline
        const { data, error } = await supabase
          .from("course_outlines")
          .insert({
            course_id,
            requirements,
            chapters,
            created_by: user.id,
          })
          .select()
          .single()

        if (error) {
          console.error("Error creating course outline:", error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        result = data
      }
    } else {
      return NextResponse.json({ error: "Invalid outline type or missing course_id" }, { status: 400 })
    }

    return NextResponse.json({ success: true, outline: result, outline_type })
  } catch (error: any) {
    console.error("Error in POST /api/classes/[id]/outline:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/classes/[id]/outline
 * Update the outline for a class (alias for POST)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Delegate to POST handler
  return POST(req, { params })
}

