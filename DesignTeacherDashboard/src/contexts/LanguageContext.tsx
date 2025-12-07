import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Teacher Dashboard',
    'dashboard.classes': 'Classes',
    'dashboard.upcomingSessions': 'Upcoming Sessions',
    'dashboard.assignments': 'Assignments',
    'dashboard.students': 'students',
    'dashboard.sessions': 'sessions',
    'dashboard.assignments_count': 'assignments',
    'dashboard.online': 'Online',
    'dashboard.inPerson': 'In Person',
    'dashboard.submitted': 'Submitted',
    'dashboard.pending': 'Pending',
    'dashboard.viewDetails': 'View Details',
    'dashboard.dueDate': 'Due',
    
    // Class Detail
    'class.backToDashboard': 'Back to Dashboard',
    'class.sessions': 'Sessions',
    'class.assignments': 'Assignments',
    'class.students': 'Students',
    'class.description': 'Description',
    'class.schedule': 'Schedule',
    'class.duration': 'Duration',
    'class.location': 'Location',
    'class.online': 'Online',
    'class.room': 'Room',
    'class.dueDate': 'Due Date',
    'class.submissions': 'Submissions',
    
    // Session Detail
    'session.backToDashboard': 'Back to Dashboard',
    'session.content': 'Content',
    'session.script': 'Script',
    'session.sessionInfo': 'Session Information',
    'session.date': 'Date',
    'session.time': 'Time',
    'session.duration': 'Duration',
    'session.location': 'Location',
    'session.materials': 'Materials',
    'session.preparation': 'Preparation',
    'session.objectives': 'Learning Objectives',
    'session.activities': 'Activities',
    'session.homework': 'Homework',
    'session.outline': 'Outline',
    
    // Assignment Detail
    'assignment.backToDashboard': 'Back to Dashboard',
    'assignment.overview': 'Assignment Overview',
    'assignment.title': 'Title',
    'assignment.class': 'Class',
    'assignment.dueDate': 'Due Date',
    'assignment.totalPoints': 'Total Points',
    'assignment.description': 'Description',
    'assignment.submissions': 'Submissions',
    'assignment.submitted': 'Submitted',
    'assignment.pending': 'Pending',
    'assignment.graded': 'Graded',
    'assignment.studentList': 'Student Submissions',
    'assignment.student': 'Student',
    'assignment.status': 'Status',
    'assignment.grade': 'Grade',
    'assignment.submittedOn': 'Submitted On',
    'assignment.notSubmitted': 'Not Submitted',
    'assignment.viewSubmission': 'View Submission',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.account': 'Account',
    'settings.teaching': 'Teaching',
    'settings.ai': 'AI Assistant',
    'settings.notifications': 'Notifications',
    'settings.appearance': 'Appearance',
    
    // Settings - Profile
    'settings.profile.title': 'Profile',
    'settings.profile.description': 'Manage your personal information and profile picture',
    'settings.profile.picture': 'Profile Picture',
    'settings.profile.uploadPhoto': 'Upload Photo',
    'settings.profile.photoHint': 'JPG, PNG or GIF. Max size 5MB.',
    'settings.profile.basicInfo': 'Basic Information',
    'settings.profile.fullName': 'Full Name',
    'settings.profile.title_field': 'Title',
    'settings.profile.email': 'Email',
    'settings.profile.phone': 'Phone Number',
    'settings.profile.organization': 'Organization',
    'settings.profile.department': 'Department',
    'settings.profile.bio': 'Bio',
    'settings.profile.bioPlaceholder': 'Tell us about yourself...',
    
    // Settings - Account
    'settings.account.title': 'Account',
    'settings.account.description': 'Security settings and account management',
    'settings.account.password': 'Password',
    'settings.account.changePassword': 'Change Password',
    'settings.account.cancel': 'Cancel',
    'settings.account.currentPassword': 'Current Password',
    'settings.account.newPassword': 'New Password',
    'settings.account.confirmPassword': 'Confirm New Password',
    'settings.account.twoFactor': 'Two-Factor Authentication',
    'settings.account.twoFactorDesc': 'Add an extra layer of security to your account',
    'settings.account.connectedAccounts': 'Connected Accounts',
    'settings.account.notConnected': 'Not connected',
    'settings.account.dangerZone': 'Danger Zone',
    'settings.account.deleteAccount': 'Delete Account',
    'settings.account.deleteAccountDesc': 'Permanently delete your account and all data',
    'settings.account.delete': 'Delete',
    'settings.account.deleteConfirmTitle': 'Delete Account',
    'settings.account.deleteConfirmMessage': 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
    'settings.account.confirmDelete': 'Delete Account',
    
    // Settings - Teaching
    'settings.teaching.title': 'Teaching',
    'settings.teaching.description': 'Configure your teaching preferences',
    'settings.teaching.sessionDefaults': 'Session Defaults',
    'settings.teaching.defaultDuration': 'Default Session Duration',
    'settings.teaching.grading': 'Grading System',
    'settings.teaching.gradingScale': 'Grading Scale',
    'settings.teaching.lateSubmission': 'Late Submission Policy',
    'settings.teaching.classSettings': 'Class Settings',
    'settings.teaching.defaultCapacity': 'Default Class Capacity',
    
    // Settings - AI
    'settings.ai.title': 'AI Assistant',
    'settings.ai.description': 'Customize your AI assistant behavior',
    'settings.ai.suggestions': 'AI Suggestions',
    'settings.ai.enableSuggestions': 'Enable AI Suggestions',
    'settings.ai.suggestionsDesc': 'Get intelligent suggestions while working',
    'settings.ai.autoGenerate': 'Auto-Generate Content',
    'settings.ai.autoGenerateDesc': 'Let AI help create session content automatically',
    'settings.ai.contextMemory': 'Context Memory',
    'settings.ai.contextMemoryDesc': 'How long AI remembers conversation context',
    'settings.ai.responseStyle': 'Response Style',
    'settings.ai.autoOutline': 'Auto-Outline Tags',
    'settings.ai.autoOutlineDesc': 'Automatically tag outline items in conversations',
    
    // Settings - Notifications
    'settings.notifications.title': 'Notifications',
    'settings.notifications.description': 'Control how you receive notifications',
    'settings.notifications.channels': 'Notification Channels',
    'settings.notifications.email': 'Email Notifications',
    'settings.notifications.emailDesc': 'Receive notifications via email',
    'settings.notifications.push': 'Push Notifications',
    'settings.notifications.pushDesc': 'Receive push notifications in browser',
    'settings.notifications.sessionReminder': 'Session Reminder',
    'settings.notifications.reminderTiming': 'Remind me before sessions',
    'settings.notifications.teachingAlerts': 'Teaching Alerts',
    'settings.notifications.assignmentDue': 'Assignment Due Reminders',
    'settings.notifications.assignmentDueDesc': 'Remind about upcoming assignment deadlines',
    'settings.notifications.studentSubmission': 'Student Submission Alerts',
    'settings.notifications.studentSubmissionDesc': 'Notify when students submit assignments',
    'settings.notifications.lateSubmission': 'Late Submission Alerts',
    'settings.notifications.lateSubmissionDesc': 'Notify about late submissions',
    
    // Settings - Appearance
    'settings.appearance.title': 'Appearance',
    'settings.appearance.description': 'Personalize your interface preferences',
    'settings.appearance.languageRegion': 'Language & Region',
    'settings.appearance.language': 'Language',
    'settings.appearance.timezone': 'Timezone',
    'settings.appearance.dateFormat': 'Date Format',
    'settings.appearance.timeFormat': 'Time Format',
    'settings.appearance.weekStart': 'Week Starts On',
    
    // Common
    'common.save': 'Save Changes',
    'common.reset': 'Reset',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.back': 'Back',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Toast Messages
    'toast.saveSuccess': 'Settings saved successfully!',
    'toast.saveFailed': 'Failed to save settings',
    'toast.discarded': 'Changes discarded',
    'toast.deleteSuccess': 'Deleted successfully',
    'toast.deleteFailed': 'Failed to delete',
    'toast.deleteCancelled': 'Account deletion cancelled',
    
    // Time units
    'time.30min': '30 minutes',
    'time.1hour': '1 hour',
    'time.1day': '1 day',
    'time.7days': '7 days',
    'time.30days': '30 days',
    
    // Options
    'option.percentage': 'Percentage (0-100)',
    'option.letterGrade': 'Letter Grade (A-F)',
    'option.points': 'Points',
    'option.deduction': 'Penalty Deduction',
    'option.notAccepted': 'Not Accepted',
    'option.caseByCase': 'Case by Case',
    'option.professional': 'Professional',
    'option.casual': 'Casual',
    'option.detailed': 'Detailed',
    'option.12h': '12-hour',
    'option.24h': '24-hour',
    'option.sunday': 'Sunday',
    'option.monday': 'Monday',
    
    // Title options
    'title.professor': 'Professor',
    'title.dr': 'Dr.',
    'title.mr': 'Mr.',
    'title.ms': 'Ms.',
    'title.instructor': 'Instructor',
    
    // AI Chatbot
    'ai.title': 'AI Assistant',
    'ai.placeholder': 'Ask me anything...',
    'ai.suggestedPrompt1': 'Help me create a lesson plan',
    'ai.suggestedPrompt2': 'Suggest assignment ideas',
    'ai.suggestedPrompt3': 'Grade this submission',
  },
  zh: {
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.settings': '设置',
    'nav.logout': '退出登录',
    
    // Dashboard
    'dashboard.title': '教师仪表板',
    'dashboard.classes': '课程',
    'dashboard.upcomingSessions': '即将到来的课程',
    'dashboard.assignments': '作业',
    'dashboard.students': '学生',
    'dashboard.sessions': '课时',
    'dashboard.assignments_count': '作业',
    'dashboard.online': '在线',
    'dashboard.inPerson': '线下',
    'dashboard.submitted': '已提交',
    'dashboard.pending': '待提交',
    'dashboard.viewDetails': '查看详情',
    'dashboard.dueDate': '截止日期',
    
    // Class Detail
    'class.backToDashboard': '返回仪表板',
    'class.sessions': '课时',
    'class.assignments': '作业',
    'class.students': '学生',
    'class.description': '描述',
    'class.schedule': '时间表',
    'class.duration': '时长',
    'class.location': '地点',
    'class.online': '在线',
    'class.room': '教室',
    'class.dueDate': '截止日期',
    'class.submissions': '提交情况',
    
    // Session Detail
    'session.backToDashboard': '返回仪表板',
    'session.content': '内容',
    'session.script': '讲稿',
    'session.sessionInfo': '课程信息',
    'session.date': '日期',
    'session.time': '时间',
    'session.duration': '时长',
    'session.location': '地点',
    'session.materials': '材料',
    'session.preparation': '准备工作',
    'session.objectives': '学习目标',
    'session.activities': '活动',
    'session.homework': '作业',
    'session.outline': '大纲',
    
    // Assignment Detail
    'assignment.backToDashboard': '返回仪表板',
    'assignment.overview': '作业概览',
    'assignment.title': '标题',
    'assignment.class': '课程',
    'assignment.dueDate': '截止日期',
    'assignment.totalPoints': '总分',
    'assignment.description': '描述',
    'assignment.submissions': '提交情况',
    'assignment.submitted': '已提交',
    'assignment.pending': '待提交',
    'assignment.graded': '已评分',
    'assignment.studentList': '学生提交列表',
    'assignment.student': '学生',
    'assignment.status': '状态',
    'assignment.grade': '成绩',
    'assignment.submittedOn': '提交时间',
    'assignment.notSubmitted': '未提交',
    'assignment.viewSubmission': '查看提交',
    
    // Settings
    'settings.title': '设置',
    'settings.profile': '个人资料',
    'settings.account': '账户',
    'settings.teaching': '教学',
    'settings.ai': 'AI助手',
    'settings.notifications': '通知',
    'settings.appearance': '外观',
    
    // Settings - Profile
    'settings.profile.title': '个人资料',
    'settings.profile.description': '管理您的个人信息和头像',
    'settings.profile.picture': '头像',
    'settings.profile.uploadPhoto': '上传照片',
    'settings.profile.photoHint': 'JPG、PNG或GIF格式，最大5MB。',
    'settings.profile.basicInfo': '基本信息',
    'settings.profile.fullName': '姓名',
    'settings.profile.title_field': '职称',
    'settings.profile.email': '邮箱',
    'settings.profile.phone': '电话',
    'settings.profile.organization': '组织',
    'settings.profile.department': '部门',
    'settings.profile.bio': '简介',
    'settings.profile.bioPlaceholder': '介绍一下您自己...',
    
    // Settings - Account
    'settings.account.title': '账户',
    'settings.account.description': '安全设置和账户管理',
    'settings.account.password': '密码',
    'settings.account.changePassword': '修改密码',
    'settings.account.cancel': '取消',
    'settings.account.currentPassword': '当前密码',
    'settings.account.newPassword': '新密码',
    'settings.account.confirmPassword': '确认新密码',
    'settings.account.twoFactor': '双因素认证',
    'settings.account.twoFactorDesc': '为您的账户添加额外的安全保护',
    'settings.account.connectedAccounts': '关联账户',
    'settings.account.notConnected': '未关联',
    'settings.account.dangerZone': '危险区域',
    'settings.account.deleteAccount': '删除账户',
    'settings.account.deleteAccountDesc': '永久删除您的账户和所有数据',
    'settings.account.delete': '删除',
    'settings.account.deleteConfirmTitle': '删除账户',
    'settings.account.deleteConfirmMessage': '您确定要删除您的账户吗？此操作无法撤销，所有数据将被永久删除。',
    'settings.account.confirmDelete': '删除账户',
    
    // Settings - Teaching
    'settings.teaching.title': '教学',
    'settings.teaching.description': '配置您的教学偏好',
    'settings.teaching.sessionDefaults': '课程默认设置',
    'settings.teaching.defaultDuration': '默认课程时长',
    'settings.teaching.grading': '评分系统',
    'settings.teaching.gradingScale': '评分标准',
    'settings.teaching.lateSubmission': '迟交政策',
    'settings.teaching.classSettings': '班级设置',
    'settings.teaching.defaultCapacity': '默认班级容量',
    
    // Settings - AI
    'settings.ai.title': 'AI助手',
    'settings.ai.description': '自定义您的AI助手行为',
    'settings.ai.suggestions': 'AI建议',
    'settings.ai.enableSuggestions': '启用AI建议',
    'settings.ai.suggestionsDesc': '工作时获取智能建议',
    'settings.ai.autoGenerate': '自动生成内容',
    'settings.ai.autoGenerateDesc': '让AI自动帮助创建课程内容',
    'settings.ai.contextMemory': '上下文记忆',
    'settings.ai.contextMemoryDesc': 'AI记住对话上下文的时长',
    'settings.ai.responseStyle': '回复风格',
    'settings.ai.autoOutline': '自动大纲标签',
    'settings.ai.autoOutlineDesc': '自动标记对话中的大纲项目',
    
    // Settings - Notifications
    'settings.notifications.title': '通知',
    'settings.notifications.description': '控制您接收通知的方式',
    'settings.notifications.channels': '通知渠道',
    'settings.notifications.email': '邮件通知',
    'settings.notifications.emailDesc': '通过邮件接收通知',
    'settings.notifications.push': '推送通知',
    'settings.notifications.pushDesc': '在浏览器中接收推送通知',
    'settings.notifications.sessionReminder': '课程提醒',
    'settings.notifications.reminderTiming': '课前提醒时间',
    'settings.notifications.teachingAlerts': '教学提醒',
    'settings.notifications.assignmentDue': '作业截止提醒',
    'settings.notifications.assignmentDueDesc': '提醒即将到来的作业截止日期',
    'settings.notifications.studentSubmission': '学生提交提醒',
    'settings.notifications.studentSubmissionDesc': '学生提交作业时通知',
    'settings.notifications.lateSubmission': '迟交提醒',
    'settings.notifications.lateSubmissionDesc': '迟交时通知',
    
    // Settings - Appearance
    'settings.appearance.title': '外观',
    'settings.appearance.description': '个性化您的界面偏好',
    'settings.appearance.languageRegion': '语言和地区',
    'settings.appearance.language': '语言',
    'settings.appearance.timezone': '时区',
    'settings.appearance.dateFormat': '日期格式',
    'settings.appearance.timeFormat': '时间格式',
    'settings.appearance.weekStart': '每周开始于',
    
    // Common
    'common.save': '保存更改',
    'common.reset': '重置',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.view': '查看',
    'common.back': '返回',
    'common.search': '搜索',
    'common.filter': '筛选',
    'common.sort': '排序',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    
    // Toast Messages
    'toast.saveSuccess': '设置保存成功！',
    'toast.saveFailed': '保存设置失败',
    'toast.discarded': '更改已撤销',
    'toast.deleteSuccess': '删除成功',
    'toast.deleteFailed': '删除失败',
    'toast.deleteCancelled': '账户删除已取消',
    
    // Time units
    'time.30min': '30分钟',
    'time.1hour': '1小时',
    'time.1day': '1天',
    'time.7days': '7天',
    'time.30days': '30天',
    
    // Options
    'option.percentage': '百分比 (0-100)',
    'option.letterGrade': '字母等级 (A-F)',
    'option.points': '分数',
    'option.deduction': '扣分',
    'option.notAccepted': '不接受',
    'option.caseByCase': '具体情况具体分析',
    'option.professional': '专业',
    'option.casual': '随意',
    'option.detailed': '详细',
    'option.12h': '12小时制',
    'option.24h': '24小时制',
    'option.sunday': '星期日',
    'option.monday': '星期一',
    
    // Title options
    'title.professor': '教授',
    'title.dr': '博士',
    'title.mr': '先生',
    'title.ms': '女士',
    'title.instructor': '讲师',
    
    // AI Chatbot
    'ai.title': 'AI助手',
    'ai.placeholder': '问我任何问题...',
    'ai.suggestedPrompt1': '帮我创建课程计划',
    'ai.suggestedPrompt2': '推荐作业想法',
    'ai.suggestedPrompt3': '为这份作业评分',
  },
  es: {
    // Basic Spanish translations (can be expanded)
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar sesión',
    'settings.title': 'Configuración',
    'common.save': 'Guardar cambios',
    'common.reset': 'Restablecer',
    'common.cancel': 'Cancelar',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
