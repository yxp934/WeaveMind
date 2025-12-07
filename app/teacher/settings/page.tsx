'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Palette,
  Globe,
  Clock,
  Shield,
  Zap,
  Save,
  RefreshCw,
  Monitor,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
  BookOpen,
  Target,
  Award,
  Bot,
  Brain,
  Sparkles,
  Check,
  AlertCircle,
  Info,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { RetroTitle } from '@/components/teacher/RetroTitle';
import { createClient } from "@/lib/supabase/client";
import { useRouter } from 'next/navigation';

type SettingsCategory = 'profile' | 'account' | 'teaching' | 'ai' | 'notifications' | 'appearance';

interface SettingsProps {}

export default function TeacherSettingsPage({}: SettingsProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const categories = [
    { id: 'profile' as const, label: 'Profile', icon: User, color: '#B882B1' },
    { id: 'account' as const, label: 'Account', icon: Shield, color: '#3FA11B' },
    { id: 'teaching' as const, label: 'Teaching', icon: BookOpen, color: '#B882B1' },
    { id: 'ai' as const, label: 'AI Assistant', icon: Bot, color: '#3FA11B' },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, color: '#B882B1' },
    { id: 'appearance' as const, label: 'Appearance', icon: Globe, color: '#3FA11B' }
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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasUnsavedChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteDialog(false);
    alert('Account deletion cancelled');
  };

  const ToggleSwitch = ({ enabled, onChange, color }: { enabled: boolean; onChange: () => void; color: string }) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onChange}
      className="relative w-14 h-7 rounded-full transition-colors"
      style={{ backgroundColor: enabled ? color : '#d1d5db' }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
        animate={{ x: enabled ? 28 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );

  const InputField = ({ label, value, onChange, type = 'text', placeholder, color }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all"
        style={{ '--tw-border-opacity': '1' } as any}
        onFocus={(e) => e.target.style.borderColor = color}
        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
      />
    </div>
  );

  const SelectField = ({ label, value, onChange, options, color }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-2 transition-all cursor-pointer"
        onFocus={(e) => e.target.style.borderColor = color}
        onBlur={(e) => e.target.style.borderColor = 'rgb(229 231 235)'}
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[#B882B1] text-[32px] cursor-pointer hover:opacity-80 transition-opacity font-bold" onClick={() => router.push('/teacher')}>
              WeaveMind
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search settings..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-[320px] focus:outline-none focus:border-[#B882B1] transition-colors"
              />
            </div>
            <button
              onClick={() => router.push('/teacher')}
              className="px-6 py-2 bg-[#B882B1] text-white rounded-lg hover:bg-[#A172A1] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8 mx-auto max-w-[1800px] pt-32 px-12 pb-12">
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
              <RetroTitle
                text={currentCategory.label}
                className="mb-2"
                color={currentCategory.color}
              />
              <p className="text-gray-600">
                {activeCategory === 'profile' && 'Manage your personal information and profile settings'}
                {activeCategory === 'account' && 'Manage your account security and connected services'}
                {activeCategory === 'teaching' && 'Configure your teaching preferences and defaults'}
                {activeCategory === 'ai' && 'Customize AI assistant behavior and features'}
                {activeCategory === 'notifications' && 'Control how and when you receive notifications'}
                {activeCategory === 'appearance' && 'Customize language, timezone, and display preferences'}
              </p>
            </div>

            {/* Profile Settings */}
            {activeCategory === 'profile' && (
              <div className="space-y-6">
                {/* Avatar Upload */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-4 text-gray-800">Profile Picture</h3>
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
                            Upload Photo
                          </span>
                        </motion.div>
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        JPG, GIF or PNG. 1MB max.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <InputField
                      label="Full Name"
                      value={profileData.fullName}
                      onChange={(e) => {
                        setProfileData({ ...profileData, fullName: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                    <SelectField
                      label="Title"
                      value={profileData.title}
                      onChange={(e) => {
                        setProfileData({ ...profileData, title: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'Professor', label: 'Professor' },
                        { value: 'Dr.', label: 'Dr.' },
                        { value: 'Mr.', label: 'Mr.' },
                        { value: 'Ms.', label: 'Ms.' },
                        { value: 'Instructor', label: 'Instructor' }
                      ]}
                      color={currentCategory.color}
                    />
                    <InputField
                      label="Email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => {
                        setProfileData({ ...profileData, email: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                    <InputField
                      label="Phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => {
                        setProfileData({ ...profileData, phone: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                    <InputField
                      label="Organization"
                      value={profileData.organization}
                      onChange={(e) => {
                        setProfileData({ ...profileData, organization: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                    <InputField
                      label="Department"
                      value={profileData.department}
                      onChange={(e) => {
                        setProfileData({ ...profileData, department: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
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
                      placeholder="Tell us about yourself..."
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
                    <h3 className="text-[18px] font-semibold text-gray-800">Password</h3>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="text-sm font-medium px-4 py-2 rounded-lg"
                      style={{ color: currentCategory.color, backgroundColor: `${currentCategory.color}15` }}
                    >
                      {showPasswordFields ? 'Cancel' : 'Change Password'}
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
                        <InputField
                          label="Current Password"
                          type="password"
                          color={currentCategory.color}
                        />
                        <InputField
                          label="New Password"
                          type="password"
                          color={currentCategory.color}
                        />
                        <InputField
                          label="Confirm Password"
                          type="password"
                          color={currentCategory.color}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[18px] font-semibold text-gray-800">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-500 mt-1">Add an extra layer of security to your account</p>
                    </div>
                    <ToggleSwitch
                      enabled={twoFactorEnabled}
                      onChange={() => {
                        setTwoFactorEnabled(!twoFactorEnabled);
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                  </div>
                </div>

                {/* Connected Accounts */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Connected Accounts</h3>
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
                      <ToggleSwitch
                        enabled={connectedAccounts.google}
                        onChange={() => {
                          setConnectedAccounts({ ...connectedAccounts, google: !connectedAccounts.google });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
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
                          <p className="text-sm text-gray-500">Not connected</p>
                        </div>
                      </div>
                      <ToggleSwitch
                        enabled={connectedAccounts.microsoft}
                        onChange={() => {
                          setConnectedAccounts({ ...connectedAccounts, microsoft: !connectedAccounts.microsoft });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border-2 border-red-200">
                  <h3 className="text-[18px] font-semibold text-red-600 mb-4">Danger Zone</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">Delete Account</p>
                      <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowDeleteDialog(true)}
                      className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={18} />
                      Delete
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* Teaching Preferences */}
            {activeCategory === 'teaching' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Session Defaults</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <SelectField
                      label="Default Duration"
                      value={teachingPrefs.defaultDuration}
                      onChange={(e) => {
                        setTeachingPrefs({ ...teachingPrefs, defaultDuration: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: '30min', label: '30 minutes' },
                        { value: '1h', label: '1 hour' },
                        { value: '2h', label: '2 hours' },
                        { value: '3h', label: '3 hours' }
                      ]}
                      color={currentCategory.color}
                    />
                    <InputField
                      label="Default Class Capacity"
                      value={teachingPrefs.classCapacity}
                      onChange={(e) => {
                        setTeachingPrefs({ ...teachingPrefs, classCapacity: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      color={currentCategory.color}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Grading Settings</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <SelectField
                      label="Grading Scale"
                      value={teachingPrefs.gradingScale}
                      onChange={(e) => {
                        setTeachingPrefs({ ...teachingPrefs, gradingScale: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'percentage', label: 'Percentage (0-100%)' },
                        { value: 'letter', label: 'Letter Grade (A-F)' },
                        { value: 'points', label: 'Points' }
                      ]}
                      color={currentCategory.color}
                    />
                    <SelectField
                      label="Late Submission Policy"
                      value={teachingPrefs.lateSubmission}
                      onChange={(e) => {
                        setTeachingPrefs({ ...teachingPrefs, lateSubmission: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'accept', label: 'Accept (No penalty)' },
                        { value: 'deduction', label: 'Accept with deduction' },
                        { value: 'reject', label: 'Reject late submissions' }
                      ]}
                      color={currentCategory.color}
                    />
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
                      <ToggleSwitch
                        enabled={aiPrefs.enableSuggestions}
                        onChange={() => {
                          setAiPrefs({ ...aiPrefs, enableSuggestions: !aiPrefs.enableSuggestions });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Auto-generate Session Content</p>
                        <p className="text-sm text-gray-500">Let AI create session materials automatically</p>
                      </div>
                      <ToggleSwitch
                        enabled={aiPrefs.autoGenerateContent}
                        onChange={() => {
                          setAiPrefs({ ...aiPrefs, autoGenerateContent: !aiPrefs.autoGenerateContent });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Auto-generate Outline</p>
                        <p className="text-sm text-gray-500">Automatically create outlines for new sessions</p>
                      </div>
                      <ToggleSwitch
                        enabled={aiPrefs.autoOutline}
                        onChange={() => {
                          setAiPrefs({ ...aiPrefs, autoOutline: !aiPrefs.autoOutline });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">AI Behavior</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <SelectField
                      label="Response Style"
                      value={aiPrefs.responseStyle}
                      onChange={(e) => {
                        setAiPrefs({ ...aiPrefs, responseStyle: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'professional', label: 'Professional' },
                        { value: 'casual', label: 'Casual' },
                        { value: 'detailed', label: 'Detailed & Technical' }
                      ]}
                      color={currentCategory.color}
                    />
                    <SelectField
                      label="Context Memory"
                      value={aiPrefs.contextMemory}
                      onChange={(e) => {
                        setAiPrefs({ ...aiPrefs, contextMemory: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: '1day', label: '1 day' },
                        { value: '7days', label: '7 days' },
                        { value: '30days', label: '30 days' },
                        { value: 'forever', label: 'Forever' }
                      ]}
                      color={currentCategory.color}
                    />
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
                      <ToggleSwitch
                        enabled={notifPrefs.emailNotifications}
                        onChange={() => {
                          setNotifPrefs({ ...notifPrefs, emailNotifications: !notifPrefs.emailNotifications });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Push Notifications</p>
                        <p className="text-sm text-gray-500">Receive browser push notifications</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifPrefs.pushNotifications}
                        onChange={() => {
                          setNotifPrefs({ ...notifPrefs, pushNotifications: !notifPrefs.pushNotifications });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Session Reminders</h3>
                  <SelectField
                    label="Remind me before session"
                    value={notifPrefs.sessionReminder}
                    onChange={(e) => {
                      setNotifPrefs({ ...notifPrefs, sessionReminder: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    options={[
                      { value: '15min', label: '15 minutes' },
                      { value: '30min', label: '30 minutes' },
                      { value: '1h', label: '1 hour' },
                      { value: '1day', label: '1 day' }
                    ]}
                    color={currentCategory.color}
                  />
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Assignment Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Assignment Due Reminders</p>
                        <p className="text-sm text-gray-500">Remind about upcoming assignment deadlines</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifPrefs.assignmentDue}
                        onChange={() => {
                          setNotifPrefs({ ...notifPrefs, assignmentDue: !notifPrefs.assignmentDue });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Student Submission Alerts</p>
                        <p className="text-sm text-gray-500">Notify when students submit assignments</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifPrefs.studentSubmission}
                        onChange={() => {
                          setNotifPrefs({ ...notifPrefs, studentSubmission: !notifPrefs.studentSubmission });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">Late Submission Alerts</p>
                        <p className="text-sm text-gray-500">Notify about late submissions</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifPrefs.lateSubmission}
                        onChange={() => {
                          setNotifPrefs({ ...notifPrefs, lateSubmission: !notifPrefs.lateSubmission });
                          setHasUnsavedChanges(true);
                        }}
                        color={currentCategory.color}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Settings */}
            {activeCategory === 'appearance' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Language & Region</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <SelectField
                      label="Language"
                      value={appearancePrefs.language}
                      onChange={(e) => {
                        setAppearancePrefs({ ...appearancePrefs, language: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'zh', label: '中文' },
                        { value: 'es', label: 'Español' }
                      ]}
                      color={currentCategory.color}
                    />
                    <SelectField
                      label="Timezone"
                      value={appearancePrefs.timezone}
                      onChange={(e) => {
                        setAppearancePrefs({ ...appearancePrefs, timezone: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'America/Los_Angeles', label: 'Pacific Time (PST)' },
                        { value: 'America/New_York', label: 'Eastern Time (EST)' },
                        { value: 'America/Chicago', label: 'Central Time (CST)' },
                        { value: 'Europe/London', label: 'London (GMT)' },
                        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' }
                      ]}
                      color={currentCategory.color}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Date & Time Format</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <SelectField
                      label="Date Format"
                      value={appearancePrefs.dateFormat}
                      onChange={(e) => {
                        setAppearancePrefs({ ...appearancePrefs, dateFormat: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
                      ]}
                      color={currentCategory.color}
                    />
                    <SelectField
                      label="Time Format"
                      value={appearancePrefs.timeFormat}
                      onChange={(e) => {
                        setAppearancePrefs({ ...appearancePrefs, timeFormat: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      options={[
                        { value: '12h', label: '12-hour' },
                        { value: '24h', label: '24-hour' }
                      ]}
                      color={currentCategory.color}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-[18px] font-semibold mb-6 text-gray-800">Calendar Settings</h3>
                  <SelectField
                    label="Week Starts On"
                    value={appearancePrefs.weekStart}
                    onChange={(e) => {
                      setAppearancePrefs({ ...appearancePrefs, weekStart: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    options={[
                      { value: 'sunday', label: 'Sunday' },
                      { value: 'monday', label: 'Monday' }
                    ]}
                    color={currentCategory.color}
                  />
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
                disabled={!hasUnsavedChanges || isLoading}
                className="px-8 py-4 rounded-2xl font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                style={{
                  background: hasUnsavedChanges
                    ? currentCategory.color
                    : '#d1d5db'
                }}
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setHasUnsavedChanges(false);
                  alert('Changes discarded');
                }}
                className="px-6 py-4 rounded-2xl font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset
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
                <h3 className="text-[24px] font-semibold text-gray-800">Delete Account</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteAccount}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete Account
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
