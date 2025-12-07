import { Bell, Search, Settings, MessageSquare } from 'lucide-react';
import { Building2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NavigationProps {
  userName: string;
  userAvatar: string;
  organization: string;
  onNavigateToSettings?: () => void;
  onNavigateToSettingsProfile?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToDiscussions?: () => void;
}

export default function Navigation({ userName, userAvatar, organization, onNavigateToSettings, onNavigateToSettingsProfile, onNavigateToHome, onNavigateToNotifications, onNavigateToDiscussions }: NavigationProps) {
  const { t } = useLanguage();
  
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 
            onClick={onNavigateToHome}
            className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[32px] cursor-pointer hover:opacity-80 transition-opacity"
          >
            WeaveMind
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
            <input
              type="text"
              placeholder={t('common.search') + ' courses, assignments...'}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-[320px] focus:outline-none focus:border-[#B882B1] transition-colors"
            />
          </div>
          
          <button 
            onClick={onNavigateToNotifications}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="size-5 text-gray-600" />
            <span className="absolute top-1 right-1 size-2 bg-[#B882B1] rounded-full" />
          </button>
          
          <button 
            onClick={onNavigateToDiscussions}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageSquare className="size-5 text-gray-600" />
            <span className="absolute top-1 right-1 size-2 bg-[#B882B1] rounded-full" />
          </button>
          
          <button 
            onClick={onNavigateToSettings}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="size-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <img
              src={userAvatar}
              alt={userName}
              onClick={onNavigateToSettingsProfile || onNavigateToSettings}
              className="size-10 rounded-full object-cover border-2 border-[#B882B1] cursor-pointer hover:opacity-80 transition-opacity"
            />
            <div className="flex flex-col">
              <span className="text-[#364153] text-[15px]">{userName}</span>
              <div className="flex items-center gap-1">
                <Building2 className="size-3 text-gray-400" />
                <span className="text-[11px] text-gray-400">{organization}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}