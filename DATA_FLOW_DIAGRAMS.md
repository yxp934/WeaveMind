# WeaveMind 数据流程图

## 1. Outline Generation 数据流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as ClassOutlineAssistant
    participant C as CourseChat
    participant API as /api/ai/generate-outline
    participant AI as AI模型
    participant DB as Supabase

    U->>UI: 1. 启动大纲助手
    UI->>C: 2. 显示Chat界面
    U->>C: 3. 与AI对话描述课程
    C->>API: 4. 发送需求数据
    
    API->>API: 5. 验证用户权限
    API->>AI: 6. 调用AI生成大纲
    
    AI-->>API: 7. 返回JSON大纲
    API->>API: 8. 解析JSON响应
    API-->>UI: 9. 返回生成的大纲
    
    UI->>UI: 10. 显示大纲编辑器
    U->>UI: 11. 编辑/修改大纲
    UI->>API: 12. 保存大纲
    
    API->>DB: 13. 插入course_outlines记录
    DB-->>API: 14. 确认保存
    API-->>UI: 15. 返回成功状态
    UI-->>U: 16. 显示完成消息
```

## 2. A2A Session Generation 数据流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as CourseSessionsWrapper
    participant API as /api/ai/generate-session-content
    participant OR as Orchestrator
    participant TA as Teacher Agent
    participant SA as Student Agent
    participant AI as AI模型
    participant DB as Supabase
    participant SSE as Stream

    U->>UI: 1. 点击生成会话内容
    UI->>API: 2. 发送生成请求
    
    API->>API: 3. 验证权限和参数
    API->>OR: 4. 启动A2A生成流程
    
    loop 迭代轮次 (1-3轮)
        OR->>TA: 5. Teacher生成内容
        TA->>AI: 6. 调用AI生成组件
        
        AI-->>TA: 7. 返回组件内容
        TA-->>OR: 8. 返回组件数组
        
        OR->>SSE: 9. 发送teacher_content事件
        SSE->>UI: 10. 流式推送内容
        
        alt 非最后一轮
            OR->>SA: 11. Student评审内容
            SA->>AI: 12. 调用AI进行评审
            
            AI-->>SA: 13. 返回评分和反馈
            SA-->>OR: 14. 返回评审结果
            
            OR->>SSE: 15. 发送student_feedback事件
            SSE->>UI: 16. 流式推送反馈
        end
    end
    
    OR->>SSE: 17. 发送a2a_complete事件
    SSE->>UI: 18. 推送最终结果
    
    U->>UI: 19. 保存生成的内容
    UI->>API: 20. 调用保存API
    
    API->>DB: 21. 创建chapter记录
    API->>DB: 22. 批量插入components
    API->>DB: 23. 更新session状态
    
    DB-->>API: 24. 确认保存
    API-->>UI: 25. 返回成功
    UI-->>U: 26. 显示完成状态
```

## 3. 数据库表关系图

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ CLASSES : contains
    ORGANIZATIONS ||--o{ COURSES : contains
    
    CLASSES ||--o{ CLASS_MEMBERS : has
    USERS ||--o{ CLASS_MEMBERS : joins
    CLASSES ||--o{ COURSES : owns
    CLASSES ||--o{ COURSE_SESSIONS : schedules
    
    COURSES ||--o{ COURSE_OUTLINES : generates
    COURSES ||--o{ CHAPTERS : contains
    COURSES ||--o{ AI_GENERATION_RUNS : creates
    
    CHAPTERS ||--o{ COMPONENTS : contains
    COURSE_SESSIONS ||--o{ CHAPTERS : maps_to
    
    AI_GENERATION_RUNS ||--o{ AI_GENERATION_CHAPTER_RESULTS : tracks
    CHAPTERS ||--o{ AI_GENERATION_CHAPTER_RESULTS : generates
    
    ORGANIZATIONS {
        uuid id PK
        string name
        string description
        uuid created_by
        timestamptz created_at
    }
    
    CLASSES {
        uuid id PK
        uuid organization_id FK
        string name
        string description
        uuid created_by
        timestamptz created_at
    }
    
    COURSES {
        uuid id PK
        uuid class_id FK
        uuid organization_id FK
        string title
        text description
        uuid created_by
        timestamptz created_at
    }
    
    COURSE_OUTLINES {
        uuid id PK
        uuid course_id FK
        jsonb requirements
        jsonb chapters
        uuid created_by
        timestamptz created_at
    }
    
    AI_GENERATION_RUNS {
        uuid id PK
        uuid course_id FK
        uuid created_by
        text status
        integer total_chapters
        integer completed_chapers
        integer max_iterations_per_chapter
        jsonb config
        text error_message
        timestamptz created_at
        timestamptz updated_at
    }
    
    AI_GENERATION_CHAPTER_RESULTS {
        uuid id PK
        uuid run_id FK
        uuid chapter_id FK
        text status
        integer iterations_used
        jsonb builder_critic_dialogue
        jsonb proposed_components
        text error_message
        timestamptz created_at
        timestamptz updated_at
    }
    
    CHAPTERS {
        uuid id PK
        uuid course_id FK
        uuid class_id FK
        string title
        text description
        integer order_index
        timestamptz created_at
        timestamptz updated_at
    }
    
    COMPONENTS {
        uuid id PK
        uuid chapter_id FK
        text type
        jsonb content
        integer order_index
        timestamptz created_at
        timestamptz updated_at
    }
    
    COURSE_SESSIONS {
        uuid id PK
        uuid course_id FK
        uuid class_id FK
        integer session_number
        string title
        text description
        date scheduled_date
        time start_time
        time end_time
        integer duration_minutes
        boolean content_generated
        uuid chapter_id FK
        boolean posted
        timestamptz created_at
        timestamptz updated_at
    }
```

## 4. A2A 迭代流程图

```mermaid
flowchart TD
    A[开始A2A生成] --> B[第1轮迭代]
    B --> C[Teacher Agent生成内容]
    C --> D[Student Agent评审]
    D --> E{评分 ≥ 8.5?}
    
    E -->|否| F[第2轮迭代]
    F --> G[Teacher Agent响应反馈]
    G --> H[Student Agent评审]
    H --> I{评分 ≥ 8.5?}
    
    I -->|否| J[第3轮迭代]
    J --> K[Teacher Agent最终完善]
    K --> L[输出最终内容]
    
    E -->|是 且 ≥ 3轮| L
    I -->|是 且 ≥ 3轮| L
    
    L --> M[保存到数据库]
    M --> N[完成]
    
    style A fill:#e1f5fe
    style N fill:#c8e6c9
    style D fill:#fff3e0
    style H fill:#fff3e0
    style L fill:#e8f5e8
```

## 5. API 调用流程图

```mermaid
flowchart LR
    subgraph Client[客户端]
        A[Outline Assistant]
        B[Session Wrapper]
        C[Generation Panel]
    end
    
    subgraph API[API层]
        D[/api/ai/generate-outline]
        E[/api/ai/generate-session-content]
        F[/api/ai/save-session-content]
        G[/api/ai/generation-runs]
        H[/api/ai/generation-runs/[id]/accept]
    end
    
    subgraph Queue[队列系统]
        I[BullMQ Queue]
        J[AI Generation Worker]
    end
    
    subgraph Database[数据库]
        K[(Supabase PostgreSQL)]
        L[(Redis)]
    end
    
    A --> D
    D --> K
    A --> F
    F --> K
    
    B --> E
    E --> I
    I --> J
    J --> K
    
    C --> G
    G --> K
    G --> H
    H --> K
    
    J --> L
    
    style A fill:#bbdefb
    style B fill:#bbdefb
    style C fill:#bbdefb
    style D fill:#f3e5f5
    style E fill:#f3e5f5
    style F fill:#f3e5f5
    style G fill:#f3e5f5
    style I fill:#fff3e0
    style J fill:#fff3e0
    style K fill:#e8f5e8
    style L fill:#e8f5e8
```

## 6. 错误处理流程图

```mermaid
flowchart TD
    A[API调用] --> B{验证权限}
    B -->|失败| C[返回401/403]
    B -->|成功| D[执行业务逻辑]
    
    D --> E{AI调用}
    E -->|失败| F[记录错误日志]
    F --> G[返回500错误]
    
    E -->|成功| H[解析AI响应]
    H --> I{JSON解析}
    I -->|失败| J[尝试提取JSON]
    J --> K{提取成功?}
    K -->|失败| L[返回解析错误]
    K -->|成功| M[继续处理]
    
    I -->|成功| M
    M --> N[数据库操作]
    N --> O{数据库错误}
    O -->|失败| P[事务回滚]
    P --> Q[返回数据库错误]
    O -->|成功| R[返回成功]
    
    C --> S[记录审计日志]
    G --> S
    L --> S
    Q --> S
    
    style C fill:#ffcdd2
    style G fill:#ffcdd2
    style L fill:#ffcdd2
    style Q fill:#ffcdd2
    style R fill:#c8e6c9
```

## 7. 数据安全流程图

```mermaid
sequenceDiagram
    participant U as 用户
    participant M as Middleware
    participant R as RLS策略
    participant DB as Supabase
    participant L as 审计日志

    U->>M: 发送请求
    M->>M: 验证JWT令牌
    M->>DB: 查询用户权限
    DB->>R: 应用RLS策略
    
    alt 权限验证失败
        R-->>M: 拒绝访问
        M-->>U: 返回403
        M->>L: 记录未授权访问
    else 权限验证成功
        R-->>DB: 允许操作
        DB->>DB: 执行SQL
        DB-->>M: 返回数据
        M-->>U: 返回响应
        M->>L: 记录操作日志
    end
```

## 8. 流式响应数据流

```mermaid
sequenceDiagram
    participant C as 客户端
    participant A as API服务器
    participant O as Orchestrator
    participant T as Teacher Agent
    participant S as Student Agent

    C->>A: 1. 发起生成请求
    A->>O: 2. 启动生成流程
    
    O->>T: 3. 调用Teacher
    T-->>O: 4. 返回内容
    O->>A: 5. 发送SSE事件: teacher_content
    A->>C: 6. 流式推送
    
    O->>S: 7. 调用Student
    S-->>O: 8. 返回反馈
    O->>A: 9. 发送SSE事件: student_feedback
    A->>C: 10. 流式推送
    
    Note over O,S: 重复3轮迭代
    
    O->>A: 11. 发送SSE事件: a2a_complete
    A->>C: 12. 推送最终结果
    C->>A: 13. 关闭连接
```

---

**图表说明**:
- `||--o{` 表示一对多关系
- `PK` 表示主键
- `FK` 表示外键
- 实线箭头表示直接调用
- 虚线箭头表示返回/响应
- 不同颜色表示不同系统层级

**文件位置**:
- 详细分析报告: `/OUTLINE_AND_A2A_SESSION_ANALYSIS_REPORT.md`
- 总结文档: `/ANALYSIS_SUMMARY.md`
- 数据流程图: `/DATA_FLOW_DIAGRAMS.md`
