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

    // Fetch outline for this class
    const { data: outline, error } = await supabase
      .from("course_outlines")
      .select("*")
      .eq("class_id", id)
      .eq("created_by", user.id)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("Error fetching class outline:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ outline: outline || null })
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
    const { requirements, chapters } = await req.json()

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

    if (!classMember || classMember.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if outline already exists
    const { data: existingOutline } = await supabase
      .from("course_outlines")
      .select("id")
      .eq("class_id", id)
      .eq("created_by", user.id)
      .single()

    let result

    if (existingOutline) {
      // Update existing outline
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
      // Create new outline
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

    return NextResponse.json({ success: true, outline: result })
  } catch (error: any) {
    console.error("Error in POST /api/classes/[id]/outline:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

