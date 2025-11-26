# Phase 5 Testing Plan

**Date:** 2025-11-26  
**Status:** Ready for Execution  
**Environment:** Local Development (http://localhost:3000)

## Test Objectives

1. Verify all 6 AI editing tools function correctly
2. Test cross-chapter operations
3. Validate versioning and edit history
4. Ensure security measures are effective
5. Test UI/UX of AI editor component

## Prerequisites

- ✅ Local development server running
- ✅ Database migration applied
- ✅ Test user account available
- ✅ Test course with chapters and components created

## Test Cases

### TC1: Authentication & Authorization

**Objective:** Verify only course owners can edit courses

**Steps:**
1. Login as Teacher A
2. Create a test course with chapters
3. Logout and login as Teacher B
4. Attempt to access Teacher A's course editing page
5. Verify access is denied

**Expected Result:**
- Teacher B cannot see or edit Teacher A's course
- Appropriate error message displayed

**Status:** ⏳ Pending

---

### TC2: Insert Component Tool

**Objective:** Test inserting new components into chapters

**Steps:**
1. Login as teacher
2. Navigate to a course with chapters
3. Open AI Course Editor
4. Enter instruction: "Add a text component to the first chapter with content 'This is a test'"
5. Submit and observe results

**Expected Result:**
- AI calls insertComponent tool
- New text component appears in first chapter
- Component has correct content
- Order index is correct

**Status:** ⏳ Pending

---

### TC3: Move Component Tool

**Objective:** Test moving components between positions and chapters

**Steps:**
1. Create a course with 2 chapters, each with 3 components
2. Enter instruction: "Move the second component of chapter 1 to the end of chapter 2"
3. Submit and observe results

**Expected Result:**
- AI calls moveComponent tool
- Component is removed from chapter 1
- Component appears at end of chapter 2
- Order indices are updated correctly

**Status:** ⏳ Pending

---

### TC4: Delete Component Tool

**Objective:** Test deleting components

**Steps:**
1. Create a course with a chapter containing 3 components
2. Enter instruction: "Delete the first component from the chapter"
3. Submit and observe results

**Expected Result:**
- AI calls deleteComponent tool
- Component is removed
- Remaining components' order indices are updated

**Status:** ⏳ Pending

---

### TC5: Update Component Content Tool

**Objective:** Test updating component content with merge and replace modes

**Test 5a: Replace Mode**
1. Create a text component with content: `{"text": "Original content"}`
2. Enter instruction: "Replace the content of the first component with 'New content'"
3. Submit and observe results

**Expected Result:**
- AI calls updateComponentContent with merge=false
- Component content is completely replaced
- Old content is gone

**Test 5b: Merge Mode**
1. Create a text component with content: `{"text": "Original", "author": "John"}`
2. Enter instruction: "Update the first component to add a title 'Test Title' while keeping existing content"
3. Submit and observe results

**Expected Result:**
- AI calls updateComponentContent with merge=true
- New field is added
- Existing fields are preserved

**Status:** ⏳ Pending

---

### TC6: Add Examples to Concept Tool (Cross-Chapter)

**Objective:** Test cross-chapter operation

**Steps:**
1. Create a course with 3 chapters
2. Add text components mentioning "machine learning" in chapters 1 and 3
3. Enter instruction: "Add examples for 'machine learning' concept in all chapters: 'Example 1: Image recognition', 'Example 2: Natural language processing'"
4. Submit and observe results

**Expected Result:**
- AI calls addExamplesToConcept tool
- Examples are added to components in chapters 1 and 3
- Components in chapter 2 (without the keyword) are unchanged
- All matching components receive the same examples

**Status:** ⏳ Pending

---

### TC7: Get Course Structure Tool

**Objective:** Verify AI can retrieve course structure for context

**Steps:**
1. Create a course with complex structure (3 chapters, various component types)
2. Enter instruction: "Show me the structure of this course"
3. Observe AI response

**Expected Result:**
- AI calls getCourseStructure tool
- AI describes the course structure accurately
- All chapters and components are listed

**Status:** ⏳ Pending

---

### TC8: Course Versioning

**Objective:** Test automatic version creation after edits

**Steps:**
1. Create a course with chapters
2. Note the current version count (should be 0)
3. Make an AI edit (e.g., insert a component)
4. Check course_versions table
5. Verify version snapshot was created

**Expected Result:**
- New version record created in course_versions table
- Version number incremented
- Snapshot contains complete course structure
- Description includes the AI instruction

**Status:** ⏳ Pending

---

### TC9: Edit History Tracking

**Objective:** Verify all edits are logged

**Steps:**
1. Create a course
2. Make 3 different AI edits
3. Query course_edit_history table
4. Verify all edits are logged

**Expected Result:**
- 3 records in course_edit_history
- Each record contains: instruction, tool_calls, changes_summary, timestamp
- Records are associated with correct user and course

**Status:** ⏳ Pending

---

### TC10: Complex Multi-Tool Operation

**Objective:** Test AI using multiple tools in sequence

**Steps:**
1. Create a course with 2 chapters
2. Enter instruction: "First, add a text component to chapter 1 with 'Introduction'. Then, add examples for 'learning' concept in all chapters: 'Example: Spaced repetition'"
3. Submit and observe results

**Expected Result:**
- AI calls getCourseStructure first (to understand course)
- AI calls insertComponent to add text
- AI calls addExamplesToConcept to add examples
- All operations complete successfully
- Version snapshot created

**Status:** ⏳ Pending

---

### TC11: Error Handling

**Objective:** Test error handling for invalid operations

**Test 11a: Invalid Chapter ID**
1. Enter instruction: "Add a component to chapter with ID 'invalid-uuid'"
2. Submit

**Expected Result:**
- Tool returns error
- AI communicates error to user
- No version snapshot created

**Test 11b: Permission Denied**
1. Attempt to edit another user's course
2. Verify API returns 404/403

**Expected Result:**
- API rejects request
- Appropriate error message

**Status:** ⏳ Pending

---

### TC12: UI/UX Testing

**Objective:** Verify user interface works correctly

**Steps:**
1. Navigate to course detail page
2. Verify AI Course Editor component is visible (only if course has chapters)
3. Test input field responsiveness
4. Test loading states
5. Test success/error message display
6. Test tool call visualization

**Expected Result:**
- Component renders correctly
- Loading spinner shows during processing
- Success messages are green
- Error messages are red
- Tool calls and results are clearly displayed

**Status:** ⏳ Pending

---

### TC13: Security Testing

**Objective:** Verify security measures are effective

**Test 13a: SQL Injection**
1. Enter instruction with SQL injection attempt: "Add component'; DROP TABLE courses; --"
2. Submit

**Expected Result:**
- No SQL injection occurs
- Instruction is treated as plain text
- Database remains intact

**Test 13b: XSS Attempt**
1. Enter instruction: "Add component with content '<script>alert(1)</script>'"
2. Submit and view component

**Expected Result:**
- Script is not executed
- Content is properly escaped on render

**Test 13c: Unauthorized Access**
1. Attempt to call API endpoint without authentication
2. Attempt to edit another user's course

**Expected Result:**
- 401 Unauthorized for unauthenticated requests
- 404 Not Found for unauthorized course access

**Status:** ⏳ Pending

---

## Test Execution Notes

### Manual Testing Checklist
- [ ] TC1: Authentication & Authorization
- [ ] TC2: Insert Component Tool
- [ ] TC3: Move Component Tool
- [ ] TC4: Delete Component Tool
- [ ] TC5: Update Component Content Tool
- [ ] TC6: Add Examples to Concept Tool
- [ ] TC7: Get Course Structure Tool
- [ ] TC8: Course Versioning
- [ ] TC9: Edit History Tracking
- [ ] TC10: Complex Multi-Tool Operation
- [ ] TC11: Error Handling
- [ ] TC12: UI/UX Testing
- [ ] TC13: Security Testing

### Automated Testing (Future)
- Consider creating Playwright test scripts for regression testing
- Add unit tests for editing tools
- Add integration tests for API endpoints

## Test Environment

- **URL:** http://localhost:3000
- **Database:** Supabase (odowwkdgduhecrmuatnx)
- **AI Model:** meituan/longcat-flash-chat via Vercel AI Gateway
- **Browser:** Chromium (Playwright)

## Success Criteria

Phase 5 testing is considered successful when:
1. All 13 test cases pass
2. No critical or high-priority bugs found
3. Security measures verified effective
4. UI/UX is intuitive and responsive
5. Versioning and edit history work correctly

## Next Steps After Testing

1. Document any bugs found
2. Fix critical issues
3. Update security audit if new issues found
4. Deploy to production
5. Monitor production usage
6. Gather user feedback

