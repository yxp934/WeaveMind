# WeaveMind Class-Session API Testing Guide

## 🧪 **API Testing Instructions**

This guide provides comprehensive testing instructions for all implemented class-session related APIs.

---

## 📋 **Prerequisites**

### **Required Environment Variables**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VERCEL_GATEWAY_KEY=your_vercel_gateway_key
REDIS_URL=redis_connection_string (optional, for workers)
```

### **Authentication Setup**
1. Register/Login to get authentication token
2. Obtain JWT token from Supabase Auth
3. Include token in Authorization header: `Bearer <token>`

---

## 🔧 **API Testing with cURL**

### **1. Chatbot Workflow API**

#### **Start New Workflow**
```bash
curl -X POST "https://your-domain.vercel.app/api/ai/chatbot/workflow" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "workflow_type": "session_creation",
    "context": {
      "class_id": "your-class-id",
      "requirements": "Create an engaging session on React fundamentals"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow-uuid",
    "workflow_type": "session_creation",
    "context": {...},
    "current_step": "tools_discovered",
    "tools_discovered": [...],
    "status": "active"
  }
}
```

#### **Get Workflow Status**
```bash
curl -X GET "https://your-domain.vercel.app/api/ai/chatbot/workflow?id=workflow-uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### **2. AI Tools Management API**

#### **List Available Tools**
```bash
curl -X GET "https://your-domain.vercel.app/api/ai/tools/list" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "tools": [
    {
      "id": "tool-uuid",
      "tool_name": "create_session",
      "tool_description": "Create a new course session",
      "tool_category": "session_management",
      "tool_schema": {...},
      "enabled": true,
      "usage_count": 0
    }
  ],
  "categories": ["session_management", "ai_generation", "data_retrieval"],
  "total": 8
}
```

#### **Execute Tool**
```bash
curl -X POST "https://your-domain.vercel.app/api/ai/tools/call" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "workflow_id": "workflow-uuid",
    "tool_name": "create_session",
    "parameters": {
      "class_id": "your-class-id",
      "title": "Introduction to React",
      "description": "Learn the basics of React framework",
      "scheduled_date": "2024-01-15T10:00:00Z",
      "duration_minutes": 60,
      "location": "Room 101"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "session": {
      "id": "session-uuid",
      "class_id": "your-class-id",
      "session_number": 1,
      "title": "Introduction to React",
      "scheduled_date": "2024-01-15",
      "created_by": "user-uuid"
    }
  },
  "workflow": {
    "id": "workflow-uuid",
    "tools_called": [...],
    "current_step": "tool_executed"
  }
}
```

---

### **3. A2A Session Generation API**

#### **Start A2A Generation**
```bash
curl -X POST "https://your-domain.vercel.app/api/ai/session/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "session_id": "session-uuid",
    "max_iterations": 3,
    "requirements": {
      "focus": "interactive learning",
      "duration": "60 minutes"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "generation": {
    "id": "generation-uuid",
    "session_id": "session-uuid",
    "status": "running",
    "current_iteration": 1,
    "max_iterations": 3
  },
  "message": "A2A generation completed"
}
```

#### **Check Generation Status**
```bash
curl -X GET "https://your-domain.vercel.app/api/ai/session/generate?session_id=session-uuid" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "generation": {
    "id": "generation-uuid",
    "status": "completed",
    "current_iteration": 3,
    "builder_feedback": [...],
    "critic_feedback": [...],
    "final_content": {...}
  }
}
```

---

### **4. Enhanced Outline Generation API**

#### **Generate Outline (Without Saving)**
```bash
curl -X POST "https://your-domain.vercel.app/api/ai/generate-outline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requirements": {
      "goals": "Learn React fundamentals",
      "audience": "Beginner developers",
      "duration": "6 weeks",
      "style": "hands-on practical"
    }
  }'
```

#### **Generate and Save to Class**
```bash
curl -X POST "https://your-domain.vercel.app/api/ai/generate-outline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requirements": {
      "goals": "Learn React fundamentals",
      "audience": "Beginner developers"
    },
    "class_id": "your-class-id",
    "save_to_class": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "chapters": [
    {
      "title": "Introduction to React",
      "description": "Learn the basics of React and component architecture"
    }
  ],
  "requirements": {...},
  "class_id": "your-class-id",
  "saved_outline": {
    "id": "outline-uuid",
    "class_id": "your-class-id",
    "requirements": {...},
    "chapters": [...]
  }
}
```

---

### **5. Enhanced Session Management API**

#### **Get Sessions with Pagination**
```bash
# Teacher - get all sessions
curl -X GET "https://your-domain.vercel.app/api/classes/your-class-id/sessions?include_posted=true&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Student - get only posted sessions
curl -X GET "https://your-domain.vercel.app/api/classes/your-class-id/sessions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "class_id": "your-class-id",
      "session_number": 1,
      "title": "Introduction to React",
      "description": "Learn the basics",
      "scheduled_date": "2024-01-15",
      "start_time": "10:00:00",
      "duration_minutes": 60,
      "posted": true,
      "content_generated": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

#### **Create New Session**
```bash
curl -X POST "https://your-domain.vercel.app/api/classes/your-class-id/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Advanced React Patterns",
    "description": "Learn advanced React patterns and best practices",
    "scheduled_date": "2024-01-22",
    "start_time": "14:00:00",
    "duration_minutes": 90,
    "location": "Room 201"
  }'
```

**Expected Response:**
```json
{
  "session": {
    "id": "session-uuid",
    "class_id": "your-class-id",
    "session_number": 2,
    "title": "Advanced React Patterns",
    "scheduled_date": "2024-01-22",
    "start_time": "14:00:00",
    "duration_minutes": 90,
    "posted": false,
    "content_generated": false,
    "created_by": "user-uuid"
  }
}
```

---

### **6. Enhanced Class Outline API**

#### **Get Class Outline**
```bash
curl -X GET "https://your-domain.vercel.app/api/classes/your-class-id/outline" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "outline": {
    "id": "outline-uuid",
    "class_id": "your-class-id",
    "requirements": {...},
    "chapters": [...],
    "created_by": "user-uuid"
  },
  "outline_type": "class_based"
}
```

#### **Save Class-Based Outline**
```bash
curl -X POST "https://your-domain.vercel.app/api/classes/your-class-id/outline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requirements": {
      "goals": "Master React",
      "audience": "Intermediate developers"
    },
    "chapters": [
      {
        "title": "React Fundamentals",
        "description": "Core concepts and syntax"
      }
    ],
    "outline_type": "class_based"
  }'
```

#### **Save Course-Based Outline**
```bash
curl -X POST "https://your-domain.vercel.app/api/classes/your-class-id/outline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "requirements": {...},
    "chapters": [...],
": "course_b    "outline_typeased",
    "course_id": "your-course-id"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "outline": {
    "id": "outline-uuid",
    "class_id": "your-class-id",
    "course_id": "your-course-id",
    "requirements": {...},
    "chapters": [...]
  },
  "outline_type": "class_based"
}
```

---

## 🧪 **Error Testing Scenarios**

### **Authentication Errors**
```bash
# Test without token
curl -X GET "https://your-domain.vercel.app/api/ai/tools/list"

# Expected: 401 Unauthorized
```

### **Authorization Errors**
```bash
# Test accessing another user's class
curl -X POST "https://your-domain.vercel.app/api/classes/wrong-class-id/sessions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": "Test"}'

# Expected: 403 Forbidden
```

### **Validation Errors**
```bash
# Test missing required fields
curl -X POST "https://your-domain.vercel.app/api/classes/your-class-id/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": ""}'

# Expected: 400 Bad Request with error message
```

### **Not Found Errors**
```bash
# Test non-existent resource
curl -X GET "https://your-domain.vercel.app/api/ai/chatbot/workflow?id=nonexistent" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: 404 Not Found
```

---

## 📊 **Performance Testing**

### **Load Testing**
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl -X GET "https://your-domain.vercel.app/api/classes/your-class-id/sessions" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" &
done
wait
```

### **Pagination Testing**
```bash
# Test large datasets
curl -X GET "https://your-domain.vercel.app/api/classes/your-class-id/sessions?page=1&limit=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🛠️ **Postman Collection**

Create a Postman collection with the following requests:

### **Authentication**
1. **Login** - `POST /auth/v1/token?grant_type=password`
2. **Get Profile** - `GET /auth/v1/user`

### **Chatbot Workflow**
1. **Create Workflow** - `POST /api/ai/chatbot/workflow`
2. **Get Workflow** - `GET /api/ai/chatbot/workflow?id={workflow_id}`

### **AI Tools**
1. **List Tools** - `GET /api/ai/tools/list`
2. **Call Tool** - `POST /api/ai/tools/call`

### **A2A Generation**
1. **Start Generation** - `POST /api/ai/session/generate`
2. **Check Status** - `GET /api/ai/session/generate?session_id={session_id}`

### **Outline Management**
1. **Generate Outline** - `POST /api/ai/generate-outline`
2. **Get Class Outline** - `GET /api/classes/{class_id}/outline`
3. **Save Class Outline** - `POST /api/classes/{class_id}/outline`

### **Session Management**
1. **Get Sessions** - `GET /api/classes/{class_id}/sessions`
2. **Create Session** - `POST /api/classes/{class_id}/sessions`

---

## ✅ **Testing Checklist**

### **Functionality Tests**
- [ ] Authentication works for all endpoints
- [ ] Role-based access control enforced
- [ ] Session CRUD operations working
- [ ] Outline generation and saving working
- [ ] A2A generation process functional
- [ ] Tool execution working
- [ ] Chatbot workflow operational

### **Error Handling Tests**
- [ ] 401 for missing authentication
- [ ] 403 for insufficient permissions
- [ ] 400 for invalid input
- [ ] 404 for non-existent resources
- [ ] 500 for server errors

### **Performance Tests**
- [ ] API responses under 2 seconds
- [ ] Pagination working correctly
- [ ] Large datasets handled properly
- [ ] Concurrent requests handled

### **Security Tests**
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Data isolation between users
- [ ] Proper input validation
- [ ] RLS policies enforced

---

## 🎯 **Expected Results**

### **Success Criteria**
- ✅ All APIs return appropriate status codes
- ✅ Authentication and authorization working
- ✅ Data validation and error handling functional
- ✅ Performance meets requirements
- ✅ Security measures properly implemented

### **Failure Indicators**
- ❌ 500 errors on valid requests
- ❌ Unauthorized access to protected resources
- ❌ Data leakage between users
- ❌ Performance degradation under load
- ❌ Missing or incorrect error messages

---

## 📝 **Testing Notes**

1. **Environment Setup**: Ensure all environment variables are properly configured
2. **Database State**: Test with clean database and realistic data
3. **Token Expiration**: Test with expired tokens
4. **Network Issues**: Test timeout and connection error scenarios
5. **Rate Limiting**: Verify rate limiting works as expected

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Authentication Failures**
- Verify JWT token is valid and not expired
- Check Authorization header format: `Bearer <token>`
- Ensure user has appropriate role

#### **Permission Denied**
- Verify user is member of the class
- Check user role (teacher/student)
- Ensure RLS policies are applied

#### **API Timeouts**
- Check Vercel AI Gateway configuration
- Verify database connection
- Monitor serverless function limits

#### **Build Errors**
- Run `npm run build` to check for TypeScript errors
- Verify all imports are correct
- Check environment variable configuration

---

This testing guide provides comprehensive coverage of all implemented APIs. Follow the instructions systematically to ensure all functionality works as expected in production.