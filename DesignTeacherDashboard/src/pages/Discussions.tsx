import { useState } from 'react';
import { ArrowLeft, MessageSquare, ThumbsUp, Trash2, Send, GraduationCap, User as UserIcon, MoreVertical } from 'lucide-react';
import Navigation from '../components/Navigation';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface DiscussionsProps {
  onBack: () => void;
  onNavigateToClass?: (classId: number) => void;
  onNavigateToSession?: (sessionId: number) => void;
  onNavigateToAssignment?: (assignmentId: number) => void;
  onNavigateToSettings?: () => void;
  onNavigateToNotifications?: () => void;
}

type DiscussionCategory = 'general' | number; // general or session ID

interface Comment {
  id: number;
  discussionId: number;
  author: string;
  authorAvatar: string;
  isTeacher: boolean;
  isCurrentUser: boolean;
  content: string;
  timestamp: string;
  likes: number;
}

interface Discussion {
  id: number;
  category: DiscussionCategory;
  title: string;
  content: string;
  author: string;
  authorAvatar: string;
  isTeacher: boolean;
  isCurrentUser: boolean;
  timestamp: string;
  likes: number;
  commentsCount: number;
  comments: Comment[];
}

export default function Discussions({ onBack, onNavigateToClass, onNavigateToSession, onNavigateToAssignment, onNavigateToSettings, onNavigateToNotifications }: DiscussionsProps) {
  const [activeCategory, setActiveCategory] = useState<DiscussionCategory>('general');
  const [discussions, setDiscussions] = useState<Discussion[]>([
    {
      id: 1,
      category: 'general',
      title: 'Course Prerequisites and Preparation',
      content: 'Hi everyone! I wanted to start a discussion about what prerequisites are helpful for this course. What background knowledge did you find most useful?',
      author: 'Prof. Sarah Chen',
      authorAvatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      isTeacher: true,
      isCurrentUser: true,
      timestamp: '2 hours ago',
      likes: 12,
      commentsCount: 5,
      comments: [
        {
          id: 1,
          discussionId: 1,
          author: 'Alex Johnson',
          authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'Linear algebra was definitely crucial! Understanding matrices and vector operations made everything much clearer.',
          timestamp: '1 hour ago',
          likes: 5
        },
        {
          id: 2,
          discussionId: 1,
          author: 'Emma Davis',
          authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'I agree! Also, having some Python programming experience helped a lot with the assignments.',
          timestamp: '45 minutes ago',
          likes: 3
        },
        {
          id: 3,
          discussionId: 1,
          author: 'Michael Chen',
          authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'Calculus is important too, especially for understanding backpropagation.',
          timestamp: '30 minutes ago',
          likes: 4
        },
        {
          id: 4,
          discussionId: 1,
          author: 'Sophie Williams',
          authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'Don\'t forget statistics and probability! These are essential for understanding loss functions.',
          timestamp: '20 minutes ago',
          likes: 2
        },
        {
          id: 5,
          discussionId: 1,
          author: 'Prof. Sarah Chen',
          authorAvatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
          isTeacher: true,
          isCurrentUser: true,
          content: 'Great points everyone! These are all excellent prerequisites to review before starting.',
          timestamp: '10 minutes ago',
          likes: 8
        }
      ]
    },
    {
      id: 2,
      category: 'general',
      title: 'Study Group Formation',
      content: 'Is anyone interested in forming a study group? We could meet weekly to discuss lectures and work on assignments together.',
      author: 'David Martinez',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      isTeacher: false,
      isCurrentUser: false,
      timestamp: '5 hours ago',
      likes: 8,
      commentsCount: 2,
      comments: [
        {
          id: 6,
          discussionId: 2,
          author: 'Emily Brown',
          authorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'I\'m interested! What time works best for everyone?',
          timestamp: '3 hours ago',
          likes: 2
        },
        {
          id: 7,
          discussionId: 2,
          author: 'James Wilson',
          authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'Count me in! Weekends work better for me.',
          timestamp: '2 hours ago',
          likes: 1
        }
      ]
    },
    {
      id: 3,
      category: 0,
      title: 'Questions about Activation Functions',
      content: 'Can someone explain why we use ReLU over sigmoid in hidden layers? I\'m having trouble understanding the vanishing gradient problem.',
      author: 'Lisa Anderson',
      authorAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
      isTeacher: false,
      isCurrentUser: false,
      timestamp: '1 day ago',
      likes: 15,
      commentsCount: 4,
      comments: [
        {
          id: 8,
          discussionId: 3,
          author: 'Prof. Sarah Chen',
          authorAvatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
          isTeacher: true,
          isCurrentUser: true,
          content: 'Great question! ReLU helps avoid vanishing gradients because its derivative is always 1 for positive values, unlike sigmoid which gets very small for large inputs.',
          timestamp: '20 hours ago',
          likes: 12
        },
        {
          id: 9,
          discussionId: 3,
          author: 'Thomas Lee',
          authorAvatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'Also, ReLU is computationally cheaper - just max(0, x) instead of exponential calculations.',
          timestamp: '18 hours ago',
          likes: 6
        },
        {
          id: 10,
          discussionId: 3,
          author: 'Lisa Anderson',
          authorAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'That makes sense! Thank you both!',
          timestamp: '17 hours ago',
          likes: 3
        },
        {
          id: 11,
          discussionId: 3,
          author: 'Robert Taylor',
          authorAvatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop',
          isTeacher: false,
          isCurrentUser: false,
          content: 'Watch out for dying ReLU problem though - sometimes neurons can get stuck outputting 0.',
          timestamp: '15 hours ago',
          likes: 5
        }
      ]
    }
  ]);

  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<number>>(new Set());

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  const sessions = [
    { id: 0, title: 'Neural Networks Deep Dive' },
    { id: 1, title: 'Introduction to Deep Learning' },
    { id: 2, title: 'Convolutional Neural Networks' }
  ];

  const upcomingSessions = [
    {
      id: 0,
      title: 'Neural Networks Deep Dive',
      className: 'Machine Learning Fundamentals',
      date: 'Dec 06',
      time: '10:00 AM',
      duration: '2h',
      location: 'Zoom Meeting',
      isOnline: true,
      color: '#3FA11B'
    }
  ];

  const filteredDiscussions = discussions.filter(d => d.category === activeCategory);

  const handleCreatePost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast.error('Please fill in both title and content');
      return;
    }

    const newPost: Discussion = {
      id: Date.now(),
      category: activeCategory,
      title: newPostTitle,
      content: newPostContent,
      author: teacherData.name,
      authorAvatar: teacherData.avatar,
      isTeacher: true,
      isCurrentUser: true,
      timestamp: 'Just now',
      likes: 0,
      commentsCount: 0,
      comments: []
    };

    setDiscussions([newPost, ...discussions]);
    setNewPostTitle('');
    setNewPostContent('');
    setShowNewPostForm(false);
    toast.success('Discussion posted successfully!');
  };

  const handleDeletePost = (postId: number) => {
    setDiscussions(discussions.filter(d => d.id !== postId));
    toast.success('Discussion deleted');
  };

  const handleDeleteComment = (discussionId: number, commentId: number) => {
    setDiscussions(discussions.map(d => {
      if (d.id === discussionId) {
        return {
          ...d,
          comments: d.comments.filter(c => c.id !== commentId),
          commentsCount: d.commentsCount - 1
        };
      }
      return d;
    }));
    toast.success('Comment deleted');
  };

  const handleAddComment = (discussionId: number) => {
    if (!replyContent.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    const newComment: Comment = {
      id: Date.now(),
      discussionId,
      author: teacherData.name,
      authorAvatar: teacherData.avatar,
      isTeacher: true,
      isCurrentUser: true,
      content: replyContent,
      timestamp: 'Just now',
      likes: 0
    };

    setDiscussions(discussions.map(d => {
      if (d.id === discussionId) {
        return {
          ...d,
          comments: [...d.comments, newComment],
          commentsCount: d.commentsCount + 1
        };
      }
      return d;
    }));

    setReplyContent('');
    setReplyTo(null);
    toast.success('Comment added!');
  };

  const toggleExpanded = (discussionId: number) => {
    const newExpanded = new Set(expandedDiscussions);
    if (newExpanded.has(discussionId)) {
      newExpanded.delete(discussionId);
    } else {
      newExpanded.add(discussionId);
    }
    setExpandedDiscussions(newExpanded);
  };

  const getCategoryName = (category: DiscussionCategory) => {
    if (category === 'general') return 'General';
    const session = sessions.find(s => s.id === category);
    return session?.title || 'Unknown Session';
  };

  return (
    <div className="min-h-screen bg-[#f3e8f4]">
      <Navigation 
        userName={teacherData.name} 
        userAvatar={teacherData.avatar} 
        organization={teacherData.organization} 
        onNavigateToHome={onBack}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
        onNavigateToDiscussions={onBack}
      />

      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors mb-6"
        >
          <ArrowLeft className="size-5" />
          <span className="text-[14px]">Back to Dashboard</span>
        </button>

        <div className="flex gap-6">
          {/* Left Sidebar - Categories */}
          <div className="w-[280px] shrink-0">
            <div className="bg-white rounded-3xl p-6 shadow-sm sticky top-6">
              <h2 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[24px] leading-[1.1] mb-4">
                Topics
              </h2>
              
              <div className="space-y-2">
                <button
                  onClick={() => setActiveCategory('general')}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    activeCategory === 'general'
                      ? 'bg-[#B882B1] text-white shadow-md'
                      : 'text-[#6a7282] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="size-4" />
                    <span className="text-[14px]">General</span>
                  </div>
                </button>

                <div className="pt-2 border-t border-gray-200 mt-3">
                  <p className="text-[12px] text-[#6a7282] px-4 mb-2">Sessions</p>
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => setActiveCategory(session.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        activeCategory === session.id
                          ? 'bg-[#3FA11B] text-white shadow-md'
                          : 'text-[#6a7282] hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-[14px] line-clamp-2">{session.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[42px] leading-[1.1] mb-2">
                  Discussions
                </h1>
                <p className="text-[#6a7282] text-[16px]">
                  {getCategoryName(activeCategory)}
                </p>
              </div>
              <button
                onClick={() => setShowNewPostForm(!showNewPostForm)}
                className="px-6 py-3 rounded-xl bg-[#B882B1] text-white text-[14px] hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
              >
                <MessageSquare className="size-4" />
                New Discussion
              </button>
            </div>

            {/* New Post Form */}
            <AnimatePresence>
              {showNewPostForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <h3 className="text-[#101828] text-[18px] mb-4">Create New Discussion</h3>
                  <input
                    type="text"
                    placeholder="Discussion title..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] mb-3 focus:outline-none focus:border-[#B882B1] transition-colors"
                  />
                  <textarea
                    placeholder="What would you like to discuss?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] mb-3 focus:outline-none focus:border-[#B882B1] transition-colors resize-none"
                  />
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setShowNewPostForm(false);
                        setNewPostTitle('');
                        setNewPostContent('');
                      }}
                      className="px-4 py-2 rounded-xl text-[#6a7282] hover:bg-gray-50 transition-colors text-[14px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreatePost}
                      className="px-4 py-2 rounded-xl bg-[#B882B1] text-white hover:opacity-90 transition-opacity text-[14px]"
                    >
                      Post Discussion
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Discussions List */}
            {filteredDiscussions.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 shadow-sm text-center">
                <MessageSquare className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6a7282] text-[16px]">No discussions yet in this category</p>
                <p className="text-[#a5acb8] text-[14px] mt-2">Be the first to start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDiscussions.map(discussion => (
                  <motion.div
                    key={discussion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Discussion Header */}
                    <div className="flex gap-4 mb-4">
                      <img
                        src={discussion.authorAvatar}
                        alt={discussion.author}
                        className="size-12 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[16px] text-[#101828]">{discussion.author}</h3>
                          {discussion.isTeacher ? (
                            <div className="size-5 rounded-full bg-[#B882B1] flex items-center justify-center">
                              <GraduationCap className="size-3 text-white" />
                            </div>
                          ) : (
                            <div className="size-5 rounded-full bg-[#6a7282] flex items-center justify-center">
                              <UserIcon className="size-3 text-white" />
                            </div>
                          )}
                          {discussion.isCurrentUser && (
                            <span className="text-[10px] bg-[#3FA11B] text-white px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                          <span className="text-[12px] text-[#a5acb8]">· {discussion.timestamp}</span>
                        </div>
                        <h2 className="text-[18px] text-[#101828] mb-2">{discussion.title}</h2>
                        <p className="text-[14px] text-[#6a7282] leading-relaxed">{discussion.content}</p>
                      </div>
                      {discussion.isCurrentUser && (
                        <button
                          onClick={() => handleDeletePost(discussion.id)}
                          className="size-8 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>

                    {/* Discussion Actions */}
                    <div className="flex items-center gap-6 mb-4 pl-16">
                      <button className="flex items-center gap-1 text-[#6a7282] hover:text-[#3FA11B] transition-colors">
                        <ThumbsUp className="size-4" />
                        <span className="text-[12px]">{discussion.likes}</span>
                      </button>
                      <button 
                        onClick={() => setReplyTo(replyTo === discussion.id ? null : discussion.id)}
                        className="flex items-center gap-1 text-[#6a7282] hover:text-[#B882B1] transition-colors"
                      >
                        <MessageSquare className="size-4" />
                        <span className="text-[12px]">{discussion.commentsCount} {discussion.commentsCount === 1 ? 'comment' : 'comments'}</span>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {discussion.comments.length > 0 && (
                      <div className="pl-16 border-l-2 border-gray-100 ml-6 space-y-4">
                        {/* Show first 3 comments or all if expanded */}
                        {(expandedDiscussions.has(discussion.id) 
                          ? discussion.comments 
                          : discussion.comments.slice(0, 3)
                        ).map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <img
                              src={comment.authorAvatar}
                              alt={comment.author}
                              className="size-8 rounded-full object-cover shrink-0"
                            />
                            <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[13px] text-[#101828]">{comment.author}</span>
                                {comment.isTeacher ? (
                                  <div className="size-4 rounded-full bg-[#B882B1] flex items-center justify-center">
                                    <GraduationCap className="size-2.5 text-white" />
                                  </div>
                                ) : (
                                  <div className="size-4 rounded-full bg-[#6a7282] flex items-center justify-center">
                                    <UserIcon className="size-2.5 text-white" />
                                  </div>
                                )}
                                {comment.isCurrentUser && (
                                  <span className="text-[9px] bg-[#3FA11B] text-white px-1.5 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                                <span className="text-[11px] text-[#a5acb8]">· {comment.timestamp}</span>
                              </div>
                              <p className="text-[13px] text-[#6a7282] leading-relaxed">{comment.content}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <button className="flex items-center gap-1 text-[#a5acb8] hover:text-[#3FA11B] transition-colors">
                                  <ThumbsUp className="size-3" />
                                  <span className="text-[11px]">{comment.likes}</span>
                                </button>
                              </div>
                            </div>
                            {comment.isCurrentUser && (
                              <button
                                onClick={() => handleDeleteComment(discussion.id, comment.id)}
                                className="size-6 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex items-center justify-center shrink-0"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Show More/Less Button */}
                        {discussion.comments.length > 3 && (
                          <button
                            onClick={() => toggleExpanded(discussion.id)}
                            className="text-[#B882B1] text-[13px] hover:underline ml-11"
                          >
                            {expandedDiscussions.has(discussion.id) 
                              ? 'Show less' 
                              : `View ${discussion.comments.length - 3} more ${discussion.comments.length - 3 === 1 ? 'comment' : 'comments'}`
                            }
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reply Form */}
                    <AnimatePresence>
                      {replyTo === discussion.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pl-16 ml-6 mt-4"
                        >
                          <div className="flex gap-3">
                            <img
                              src={teacherData.avatar}
                              alt={teacherData.name}
                              className="size-8 rounded-full object-cover shrink-0"
                            />
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                placeholder="Write a comment..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(discussion.id);
                                  }
                                }}
                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#B882B1] transition-colors"
                              />
                              <button
                                onClick={() => handleAddComment(discussion.id)}
                                className="size-8 rounded-lg bg-[#B882B1] text-white hover:opacity-90 transition-opacity flex items-center justify-center shrink-0"
                              >
                                <Send className="size-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingActionMenu sessions={upcomingSessions} />
    </div>
  );
}