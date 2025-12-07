import { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { 
  User, Shield, GraduationCap, Bot, Bell, Globe, 
  Upload, Eye, EyeOff, Trash2, ChevronDown 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { useLanguage } from '../contexts/LanguageContext';

type SettingsCategory = 'profile' | 'account' | 'teaching' | 'ai' | 'notifications' | 'appearance';

interface SettingsProps {
  onBack: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToDiscussions?: () => void;
}

export default function Settings({ onBack, onNavigateToNotifications, onNavigateToDiscussions }: SettingsProps) {
  const { language, setLanguage, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Profile Settings State
  const [profileData, setProfileData] = useState({
    fullName: 'Dr. Sarah Chen',
    email: 'sarah.chen@university.edu',
    phone: '+1 (555) 123-4567',
    organization: 'Stanford University',
    department: 'Computer Science',
    title: 'Professor',
    bio: 'Passionate about AI and Machine Learning education. 10+ years of teaching experience.'
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Account Settings State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState({
    google: true,
    microsoft: false
  });

  // Teaching Preferences State
  const [teachingPrefs, setTeachingPrefs] = useState({
    defaultDuration: '1h',
    gradingScale: 'percentage',
    lateSubmission: 'deduction',
    classCapacity: '30'
  });

  // AI Assistant State
  const [aiPrefs, setAiPrefs] = useState({
    enableSuggestions: true,
    autoGenerateContent: false,
    contextMemory: '7days',
    responseStyle: 'professional',
    autoOutline: true
  });

  // Notifications State
  const [notifPrefs, setNotifPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    sessionReminder: '30min',
    assignmentDue: true,
    studentSubmission: true,
    lateSubmission: true,
    gradeReminder: true
  });

  // Appearance State
  const [appearancePrefs, setAppearancePrefs] = useState({
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    weekStart: 'sunday'
  });

  // Sync language preference with context
  useEffect(() => {
    setLanguage(appearancePrefs.language as 'en' | 'zh' | 'es');
  }, [appearancePrefs.language, setLanguage]);

  const categories = [
    { id: 'profile' as const, label: t('settings.profile'), icon: User, color: '#B882B1' },
    { id: 'account' as const, label: t('settings.account'), icon: Shield, color: '#3FA11B' },
    { id: 'teaching' as const, label: t('settings.teaching'), icon: GraduationCap, color: '#B882B1' },
    { id: 'ai' as const, label: t('settings.ai'), icon: Bot, color: '#3FA11B' },
    { id: 'notifications' as const, label: t('settings.notifications'), icon: Bell, color: '#B882B1' },
    { id: 'appearance' as const, label: t('settings.appearance'), icon: Globe, color: '#3FA11B' }
  ];

  const currentCategory = categories.find(c => c.id === activeCategory)!;

  const handleCategoryChange = (newCategory: SettingsCategory) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmed) return;
      setHasUnsavedChanges(false);
    }
    setActiveCategory(newCategory);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setHasUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // Simulate save
    setTimeout(() => {
      setHasUnsavedChanges(false);
      toast.success(t('toast.saveSuccess'));
    }, 500);
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(false);
    toast.error(t('toast.deleteCancelled'));
  };

  // Sessions data for FloatingActionMenu
  const upcomingSessions = [
    {
      title: 'Neural Networks',
      className: 'ML Fundamentals',
      date: 'Dec 06',
      time: '10:00 AM',
      duration: '2h',
      location: 'Zoom',
      isOnline: true,
      color: '#3FA11B'
    },
    {
      title: 'Supervised Learning',
      className: 'ML Fundamentals',
      date: 'Dec 03',
      time: '2:00 PM',
      duration: '1.5h',
      location: 'Room A-101',
      isOnline: false,
      color: '#3FA11B'
    }
  ];

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navigation userName={teacherData.name} userAvatar={teacherData.avatar} organization={teacherData.organization} onNavigateToHome={onBack} onNavigateToNotifications={onNavigateToNotifications} onNavigateToDiscussions={onNavigateToDiscussions} />
      <FloatingActionMenu sessions={upcomingSessions} />

      <div className="flex gap-8 mx-auto max-w-[1800px] pt-32 px-12">
        {/* Left Sidebar Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-[280px] shrink-0"
        >
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-32">
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <motion.button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    whileHover={{ x: 4 }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'shadow-md' 
                        : 'hover:bg-gray-50'
                    }`}
                    style={{
                      backgroundColor: isActive ? `${category.color}15` : 'transparent',
                      borderLeft: isActive ? `4px solid ${category.color}` : '4px solid transparent'
                    }}
                  >
                    <Icon 
                      size={20} 
                      style={{ color: isActive ? category.color : '#9ca3af' }}
                    />
                    <span 
                      className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}
                      style={{ color: isActive ? category.color : '#6b7280' }}
                    >
                      {category.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 pb-12">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="mb-8">
              <h1 
                className="text-[48px] mb-2"
                style={{ 
                  fontFamily: 'Slackey, cursive',
                  color: currentCategory.color 
                }}
              >
                {currentCategory.label}
              </h1>
              <p className="text-gray-600">
                {activeCategory === 'profile' && t('settings.profile.description')}
                {activeCategory === 'account' && t('settings.account.description')}
                {activeCategory === 'teaching' && t('settings.teaching.description')}
                {activeCategory === 'ai' && t('settings.ai.description')}
                {activeCategory === 'notifications' && t('settings.notifications.description')}
                {activeCategory === 'appearance' && t('settings.appearance.description')}
              </p>
            </div>

            {/* Profile Settings */}
            {activeCategory === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Upload */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-4 text-gray-800">{t('settings.profile.picture')}</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div 
                        className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ 
                          background: profileImage ? 'transparent' : `${currentCategory.color}20` 
                        }}
                      >
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={48} style={{ color: currentCategory.color }} />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="inline-block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="px-6 py-3 rounded-xl cursor-pointer inline-flex items-center gap-2 transition-all"
                          style={{ 
                            backgroundColor: `${currentCategory.color}15`,
                            border: `2px dashed ${currentCategory.color}` 
                          }}
                        >
                          <Upload size={18} style={{ color: currentCategory.color }} />
                          <span style={{ color: currentCategory.color }} className="font-medium">
                            {t('settings.profile.uploadPhoto')}
                          </span>
                        </motion.div>
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        {t('settings.profile.photoHint')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">{t('settings.profile.basicInfo')}</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.fullName')}</label>
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => {
                          setProfileData({ ...profileData, fullName: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                        style={{ 
                          '--tw-border-opacity': '1',
                          borderColor: 'rgb(229 231 235 / var(--tw-border-opacity))'
                        } as any}
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.title_field')}</label>
                      <select
                        value={profileData.title}
                        onChange={(e) => {
                          setProfileData({ ...profileData, title: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="Professor">{t('title.professor')}</option>
                        <option value="Dr.">{t('title.dr')}</option>
                        <option value="Mr.">{t('title.mr')}</option>
                        <option value="Ms.">{t('title.ms')}</option>
                        <option value="Instructor">{t('title.instructor')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.email')}</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => {
                          setProfileData({ ...profileData, email: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.phone')}</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => {
                          setProfileData({ ...profileData, phone: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.organization')}</label>
                      <input
                        type="text"
                        value={profileData.organization}
                        onChange={(e) => {
                          setProfileData({ ...profileData, organization: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.department')}</label>
                      <input
                        type="text"
                        value={profileData.department}
                        onChange={(e) => {
                          setProfileData({ ...profileData, department: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.bio')}</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => {
                        setProfileData({ ...profileData, bio: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all resize-none"
                      onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                      onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      placeholder={t('settings.profile.bioPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Account Settings */}
            {activeCategory === 'account' && (
              <div className="space-y-6">
                {/* Password */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[18px] font-semibold text-gray-800">{t('settings.account.password')}</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="text-sm font-medium px-4 py-2 rounded-lg"
                      style={{ color: currentCategory.color, backgroundColor: `${currentCategory.color}15` }}
                    >
                      {showPasswordFields ? t('settings.account.cancel') : t('settings.account.changePassword')}
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {showPasswordFields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.account.currentPassword')}</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                            onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                            onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.account.newPassword')}</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                            onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                            onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.account.confirmPassword')}</label>
                          <input
                            type="password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                            onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                            onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[18px] font-semibold text-gray-800">{t('settings.account.twoFactor')}</h3>
                      <p className="text-sm text-gray-500 mt-1">{t('settings.account.twoFactorDesc')}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setTwoFactorEnabled(!twoFactorEnabled);
                        setHasUnsavedChanges(true);
                      }}
                      className="relative w-14 h-7 rounded-full transition-colors"
                      style={{ backgroundColor: twoFactorEnabled ? currentCategory.color : '#d1d5db' }}
                    >
                      <motion.div
                        className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                        animate={{ x: twoFactorEnabled ? 28 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>

                {/* Connected Accounts */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">{t('settings.account.connectedAccounts')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Google</p>
                          <p className="text-sm text-gray-500">sarah.chen@gmail.com</p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setConnectedAccounts({ ...connectedAccounts, google: !connectedAccounts.google });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: connectedAccounts.google ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: connectedAccounts.google ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#F25022" d="M0 0h11.377v11.377H0z"/>
                            <path fill="#00A4EF" d="M12.623 0H24v11.377H12.623z"/>
                            <path fill="#7FBA00" d="M0 12.623h11.377V24H0z"/>
                            <path fill="#FFB900" d="M12.623 12.623H24V24H12.623z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Microsoft</p>
                          <p className="text-sm text-gray-500">{t('settings.account.notConnected')}</p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setConnectedAccounts({ ...connectedAccounts, microsoft: !connectedAccounts.microsoft });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: connectedAccounts.microsoft ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: connectedAccounts.microsoft ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border-2 border-red-200">
                  <h3 className="text-[18px] font-semibold text-red-600 mb-4">{t('settings.account.dangerZone')}</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{t('settings.account.deleteAccount')}</p>
                      <p className="text-sm text-gray-500">{t('settings.account.deleteAccountDesc')}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowDeleteDialog(true)}
                      className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      {t('settings.account.delete')}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Teaching Preferences */}
            {activeCategory === 'teaching' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">{t('settings.teaching.sessionDefaults')}</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.teaching.defaultDuration')}</label>
                      <select
                        value={teachingPrefs.defaultDuration}
                        onChange={(e) => {
                          setTeachingPrefs({ ...teachingPrefs, defaultDuration: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="30min">30 minutes</option>
                        <option value="1h">1 hour</option>
                        <option value="2h">2 hours</option>
                        <option value="3h">3 hours</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Class Capacity</label>
                      <input
                        type="number"
                        value={teachingPrefs.classCapacity}
                        onChange={(e) => {
                          setTeachingPrefs({ ...teachingPrefs, classCapacity: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Grading Settings</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grading Scale</label>
                      <select
                        value={teachingPrefs.gradingScale}
                        onChange={(e) => {
                          setTeachingPrefs({ ...teachingPrefs, gradingScale: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="percentage">Percentage (0-100%)</option>
                        <option value="letter">Letter Grade (A-F)</option>
                        <option value="points">Points</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Late Submission Policy</label>
                      <select
                        value={teachingPrefs.lateSubmission}
                        onChange={(e) => {
                          setTeachingPrefs({ ...teachingPrefs, lateSubmission: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="accept">Accept (No penalty)</option>
                        <option value="deduction">Accept with deduction</option>
                        <option value="reject">Reject late submissions</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Assistant Settings */}
            {activeCategory === 'ai' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">AI Features</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Enable AI Suggestions</p>
                        <p className="text-sm text-gray-500">Get intelligent suggestions while teaching</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAiPrefs({ ...aiPrefs, enableSuggestions: !aiPrefs.enableSuggestions });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: aiPrefs.enableSuggestions ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: aiPrefs.enableSuggestions ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Auto-generate Session Content</p>
                        <p className="text-sm text-gray-500">Let AI create session materials automatically</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAiPrefs({ ...aiPrefs, autoGenerateContent: !aiPrefs.autoGenerateContent });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: aiPrefs.autoGenerateContent ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: aiPrefs.autoGenerateContent ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Auto-generate Outline</p>
                        <p className="text-sm text-gray-500">Automatically create outlines for new sessions</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setAiPrefs({ ...aiPrefs, autoOutline: !aiPrefs.autoOutline });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: aiPrefs.autoOutline ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: aiPrefs.autoOutline ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">AI Behavior</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Response Style</label>
                      <select
                        value={aiPrefs.responseStyle}
                        onChange={(e) => {
                          setAiPrefs({ ...aiPrefs, responseStyle: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="detailed">Detailed & Technical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Context Memory</label>
                      <select
                        value={aiPrefs.contextMemory}
                        onChange={(e) => {
                          setAiPrefs({ ...aiPrefs, contextMemory: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="1day">1 day</option>
                        <option value="7days">7 days</option>
                        <option value="30days">30 days</option>
                        <option value="forever">Forever</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeCategory === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Notification Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setNotifPrefs({ ...notifPrefs, emailNotifications: !notifPrefs.emailNotifications });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: notifPrefs.emailNotifications ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: notifPrefs.emailNotifications ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive browser push notifications</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setNotifPrefs({ ...notifPrefs, pushNotifications: !notifPrefs.pushNotifications });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: notifPrefs.pushNotifications ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: notifPrefs.pushNotifications ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Session Reminders</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remind me before session</label>
                    <select
                      value={notifPrefs.sessionReminder}
                      onChange={(e) => {
                        setNotifPrefs({ ...notifPrefs, sessionReminder: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                      onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                      onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                    >
                      <option value="15min">15 minutes</option>
                      <option value="30min">30 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="1day">1 day</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Assignment Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Assignment Due Reminders</p>
                        <p className="text-sm text-gray-500">Remind about upcoming assignment deadlines</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setNotifPrefs({ ...notifPrefs, assignmentDue: !notifPrefs.assignmentDue });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: notifPrefs.assignmentDue ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: notifPrefs.assignmentDue ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Student Submission Alerts</p>
                        <p className="text-sm text-gray-500">Notify when students submit assignments</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setNotifPrefs({ ...notifPrefs, studentSubmission: !notifPrefs.studentSubmission });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: notifPrefs.studentSubmission ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: notifPrefs.studentSubmission ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Late Submission Alerts</p>
                        <p className="text-sm text-gray-500">Notify about late submissions</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setNotifPrefs({ ...notifPrefs, lateSubmission: !notifPrefs.lateSubmission });
                          setHasUnsavedChanges(true);
                        }}
                        className="relative w-14 h-7 rounded-full transition-colors"
                        style={{ backgroundColor: notifPrefs.lateSubmission ? currentCategory.color : '#d1d5db' }}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                          animate={{ x: notifPrefs.lateSubmission ? 28 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeCategory === 'appearance' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">{t('settings.appearance.languageRegion')}</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.appearance.language')}</label>
                      <select
                        value={appearancePrefs.language}
                        onChange={(e) => {
                          setAppearancePrefs({ ...appearancePrefs, language: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.appearance.timezone')}</label>
                      <select
                        value={appearancePrefs.timezone}
                        onChange={(e) => {
                          setAppearancePrefs({ ...appearancePrefs, timezone: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="America/Los_Angeles">Pacific Time (PST)</option>
                        <option value="America/New_York">Eastern Time (EST)</option>
                        <option value="America/Chicago">Central Time (CST)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Date & Time Format</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.appearance.dateFormat')}</label>
                      <select
                        value={appearancePrefs.dateFormat}
                        onChange={(e) => {
                          setAppearancePrefs({ ...appearancePrefs, dateFormat: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.appearance.timeFormat')}</label>
                      <select
                        value={appearancePrefs.timeFormat}
                        onChange={(e) => {
                          setAppearancePrefs({ ...appearancePrefs, timeFormat: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                        onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                      >
                        <option value="12h">{t('option.12h')}</option>
                        <option value="24h">{t('option.24h')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Calendar Settings</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.appearance.weekStart')}</label>
                    <select
                      value={appearancePrefs.weekStart}
                      onChange={(e) => {
                        setAppearancePrefs({ ...appearancePrefs, weekStart: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
                      onFocus={(e) => e.target.style.borderColor = currentCategory.color}
                      onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
                    >
                      <option value="sunday">{t('option.sunday')}</option>
                      <option value="monday">{t('option.monday')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <motion.div 
              className="flex items-center gap-4 mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="px-8 py-4 rounded-2xl font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ 
                  background: hasUnsavedChanges 
                    ? currentCategory.color 
                    : '#d1d5db'
                }}
              >
                {t('common.save')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setHasUnsavedChanges(false);
                  toast.info(t('toast.discarded'));
                }}
                className="px-6 py-4 rounded-2xl font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('common.reset')}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md shadow-2xl border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <h3 className="text-[24px] font-semibold text-gray-800">{t('settings.account.deleteConfirmTitle')}</h3>
              </div>
              <p className="text-gray-600 mb-6">
                {t('settings.account.deleteConfirmMessage')}
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  {t('settings.account.confirmDelete')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t('common.cancel')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
