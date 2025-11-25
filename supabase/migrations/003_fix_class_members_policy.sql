-- Fix class_members RLS policy to allow class creators to add themselves

-- Drop the existing policy
DROP POLICY IF EXISTS "Teachers can manage class members" ON class_members;

-- Create separate policies for better control
CREATE POLICY "Users can view class members if they're in the class"
    ON class_members FOR SELECT
    USING (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Class creators can add themselves as teachers"
    ON class_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        role = 'teacher' AND
        class_id IN (
            SELECT id FROM classes
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Teachers can add students to their classes"
    ON class_members FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

CREATE POLICY "Teachers can update class members"
    ON class_members FOR UPDATE
    USING (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

CREATE POLICY "Teachers can delete class members"
    ON class_members FOR DELETE
    USING (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

