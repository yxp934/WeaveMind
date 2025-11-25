-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can update their organizations"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Organization members policies
CREATE POLICY "Users can view members of their organizations"
    ON organization_members FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can manage members"
    ON organization_members FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Classes policies
CREATE POLICY "Users can view classes in their organizations"
    ON classes FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers and owners can create classes"
    ON classes FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'teacher')
        )
    );

CREATE POLICY "Class creators can update their classes"
    ON classes FOR UPDATE
    USING (created_by = auth.uid());

-- Class members policies
CREATE POLICY "Users can view class members if they're in the class"
    ON class_members FOR SELECT
    USING (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can manage class members"
    ON class_members FOR ALL
    USING (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

-- Courses policies
CREATE POLICY "Class members can view published courses"
    ON courses FOR SELECT
    USING (
        (published = TRUE AND class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        ))
        OR
        (created_by = auth.uid())
    );

CREATE POLICY "Teachers can create courses"
    ON courses FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

CREATE POLICY "Course creators can update their courses"
    ON courses FOR UPDATE
    USING (created_by = auth.uid());

-- Chapters policies
CREATE POLICY "Users can view chapters of accessible courses"
    ON chapters FOR SELECT
    USING (
        course_id IN (
            SELECT id FROM courses WHERE
            (published = TRUE AND class_id IN (
                SELECT class_id FROM class_members WHERE user_id = auth.uid()
            ))
            OR created_by = auth.uid()
        )
    );

CREATE POLICY "Course creators can manage chapters"
    ON chapters FOR ALL
    USING (
        course_id IN (
            SELECT id FROM courses WHERE created_by = auth.uid()
        )
    );

-- Components policies
CREATE POLICY "Users can view components of accessible chapters"
    ON components FOR SELECT
    USING (
        chapter_id IN (
            SELECT ch.id FROM chapters ch
            JOIN courses c ON ch.course_id = c.id
            WHERE (c.published = TRUE AND c.class_id IN (
                SELECT class_id FROM class_members WHERE user_id = auth.uid()
            ))
            OR c.created_by = auth.uid()
        )
    );

CREATE POLICY "Course creators can manage components"
    ON components FOR ALL
    USING (
        chapter_id IN (
            SELECT ch.id FROM chapters ch
            JOIN courses c ON ch.course_id = c.id
            WHERE c.created_by = auth.uid()
        )
    );

-- Assignments policies
CREATE POLICY "Class members can view assignments"
    ON assignments FOR SELECT
    USING (
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can create assignments"
    ON assignments FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

CREATE POLICY "Assignment creators can update their assignments"
    ON assignments FOR UPDATE
    USING (created_by = auth.uid());

-- Submissions policies
CREATE POLICY "Students can view their own submissions"
    ON submissions FOR SELECT
    USING (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions in their classes"
    ON submissions FOR SELECT
    USING (
        assignment_id IN (
            SELECT a.id FROM assignments a
            JOIN class_members cm ON a.class_id = cm.class_id
            WHERE cm.user_id = auth.uid() AND cm.role = 'teacher'
        )
    );

CREATE POLICY "Students can create their own submissions"
    ON submissions FOR INSERT
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own submissions"
    ON submissions FOR UPDATE
    USING (student_id = auth.uid());

CREATE POLICY "Teachers can update submissions (grading)"
    ON submissions FOR UPDATE
    USING (
        assignment_id IN (
            SELECT a.id FROM assignments a
            JOIN class_members cm ON a.class_id = cm.class_id
            WHERE cm.user_id = auth.uid() AND cm.role = 'teacher'
        )
    );

-- Files policies
CREATE POLICY "Class members can view files"
    ON files FOR SELECT
    USING (
        class_id IN (
            SELECT class_id FROM class_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can upload files"
    ON files FOR INSERT
    WITH CHECK (
        class_id IN (
            SELECT class_id FROM class_members
            WHERE user_id = auth.uid() AND role = 'teacher'
        )
    );

CREATE POLICY "File uploaders can delete their files"
    ON files FOR DELETE
    USING (uploaded_by = auth.uid());

-- Learning events policies
CREATE POLICY "Users can view their own learning events"
    ON learning_events FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Teachers can view learning events in their classes"
    ON learning_events FOR SELECT
    USING (
        course_id IN (
            SELECT c.id FROM courses c
            JOIN class_members cm ON c.class_id = cm.class_id
            WHERE cm.user_id = auth.uid() AND cm.role = 'teacher'
        )
    );

CREATE POLICY "Users can create their own learning events"
    ON learning_events FOR INSERT
    WITH CHECK (user_id = auth.uid());

