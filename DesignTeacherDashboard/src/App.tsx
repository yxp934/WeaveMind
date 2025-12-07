import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import ClassDetail from './pages/ClassDetail';
import SessionDetail from './pages/SessionDetail';
import AssignmentDetail from './pages/AssignmentDetail';
import SubmissionDetail from './pages/SubmissionDetail';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Discussions from './pages/Discussions';
import { Toaster } from 'sonner@2.0.3';
import { LanguageProvider } from './contexts/LanguageContext';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'class' | 'session' | 'assignment' | 'submission' | 'settings' | 'notifications' | 'discussions'>('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);

  const navigateToClass = (classId: number) => {
    setSelectedClassId(classId);
    setCurrentPage('class');
  };

  const navigateToSession = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setCurrentPage('session');
  };

  const navigateToAssignment = (assignmentId: number) => {
    setSelectedAssignmentId(assignmentId);
    setCurrentPage('assignment');
  };

  const navigateToSubmission = (submissionId: number) => {
    setSelectedSubmissionId(submissionId);
    setCurrentPage('submission');
  };

  const navigateBackToAssignment = () => {
    setCurrentPage('assignment');
    setSelectedSubmissionId(null);
  };

  const navigateToDashboard = () => {
    setCurrentPage('dashboard');
    setSelectedClassId(null);
    setSelectedSessionId(null);
    setSelectedAssignmentId(null);
    setSelectedSubmissionId(null);
  };

  const navigateToSettings = () => {
    setCurrentPage('settings');
  };

  const navigateToSettingsProfile = () => {
    setCurrentPage('settings');
    // Settings component will handle showing profile section
  };

  const navigateToNotifications = () => {
    setCurrentPage('notifications');
  };

  const navigateToDiscussions = () => {
    setCurrentPage('discussions');
  };

  return (
    <LanguageProvider>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-[#f3e8f4]">
        {currentPage === 'dashboard' && (
          <Dashboard
            onNavigateToClass={navigateToClass}
            onNavigateToSession={navigateToSession}
            onNavigateToAssignment={navigateToAssignment}
            onNavigateToSettings={navigateToSettings}
            onNavigateToNotifications={navigateToNotifications}
            onNavigateToDiscussions={navigateToDiscussions}
          />
        )}
        {currentPage === 'class' && selectedClassId !== null && (
          <ClassDetail
            classId={selectedClassId}
            onNavigateToSession={navigateToSession}
            onNavigateToAssignment={navigateToAssignment}
            onBack={navigateToDashboard}
            onNavigateToNotifications={navigateToNotifications}
            onNavigateToSettings={navigateToSettings}
            onNavigateToDiscussions={navigateToDiscussions}
          />
        )}
        {currentPage === 'session' && selectedSessionId !== null && (
          <SessionDetail
            sessionId={selectedSessionId}
            onBack={navigateToDashboard}
            onNavigateToNotifications={navigateToNotifications}
            onNavigateToSettings={navigateToSettings}
            onNavigateToDiscussions={navigateToDiscussions}
          />
        )}
        {currentPage === 'assignment' && selectedAssignmentId !== null && (
          <AssignmentDetail
            assignmentId={selectedAssignmentId}
            onBack={navigateToDashboard}
            onNavigateToNotifications={navigateToNotifications}
            onNavigateToSettings={navigateToSettings}
            onNavigateToDiscussions={navigateToDiscussions}
            onNavigateToSubmission={navigateToSubmission}
          />
        )}
        {currentPage === 'submission' && selectedSubmissionId !== null && selectedAssignmentId !== null && (
          <SubmissionDetail
            submissionId={selectedSubmissionId}
            assignmentId={selectedAssignmentId}
            onBack={navigateBackToAssignment}
            onNavigateToNotifications={navigateToNotifications}
            onNavigateToSettings={navigateToSettings}
            onNavigateToDiscussions={navigateToDiscussions}
          />
        )}
        {currentPage === 'settings' && (
          <Settings 
            onBack={navigateToDashboard} 
            onNavigateToNotifications={navigateToNotifications}
            onNavigateToDiscussions={navigateToDiscussions}
          />
        )}
        {currentPage === 'notifications' && (
          <Notifications 
            onBack={navigateToDashboard}
            onNavigateToClass={navigateToClass}
            onNavigateToSession={navigateToSession}
            onNavigateToAssignment={navigateToAssignment}
            onNavigateToSettings={navigateToSettings}
            onNavigateToDiscussions={navigateToDiscussions}
          />
        )}
        {currentPage === 'discussions' && (
          <Discussions 
            onBack={navigateToDashboard}
            onNavigateToClass={navigateToClass}
            onNavigateToSession={navigateToSession}
            onNavigateToAssignment={navigateToAssignment}
            onNavigateToSettings={navigateToSettings}
            onNavigateToNotifications={navigateToNotifications}
          />
        )}
      </div>
    </LanguageProvider>
  );
}