import { useState } from 'react';
import { ArrowLeft, X, Sparkles, Trash2 } from 'lucide-react';
import Navigation from '../components/Navigation';
import AIChatbot from '../components/AIChatbot';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { motion, AnimatePresence } from 'motion/react';

interface SessionDetailProps {
  sessionId: number;
  onBack: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToDiscussions?: () => void;
}

export default function SessionDetail({ sessionId, onBack, onNavigateToNotifications, onNavigateToSettings, onNavigateToDiscussions }: SessionDetailProps) {
  // Only sessionId 0 will not have content by default (as example)
  const [hasContent, setHasContent] = useState(sessionId !== 0);
  const [viewMode, setViewMode] = useState<'content' | 'script'>('content');
  const [showOutlineTag, setShowOutlineTag] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  const sessionData = {
    title: 'Neural Networks Deep Dive',
    className: 'Machine Learning Fundamentals',
    date: 'Dec 06, 2024',
    time: '10:00 AM',
    duration: '2 hours',
    location: 'Zoom Meeting'
  };

  const outline = [
    {
      title: 'Introduction to Neural Networks',
      subtopics: ['What are Neural Networks?', 'Biological Inspiration', 'Key Components']
    },
    {
      title: 'Architecture & Layers',
      subtopics: ['Input Layer', 'Hidden Layers', 'Output Layer', 'Activation Functions']
    },
    {
      title: 'Training Process',
      subtopics: ['Forward Propagation', 'Loss Function', 'Backpropagation', 'Gradient Descent']
    },
    {
      title: 'Practical Applications',
      subtopics: ['Image Recognition', 'Natural Language Processing', 'Hands-on Exercise']
    }
  ];

  const contentModules = [
    {
      type: 'text',
      content: 'Neural networks are computational models inspired by the human brain. They consist of interconnected nodes (neurons) organized in layers that process and transform data.'
    },
    {
      type: 'question',
      question: 'What is the primary inspiration behind neural networks?',
      options: ['Computer circuits', 'Mathematical equations', 'Human brain', 'Physical networks'],
      correctAnswer: 2
    },
    {
      type: 'text',
      content: 'The architecture of a neural network typically includes three types of layers: input layer (receives data), hidden layers (process information), and output layer (produces results).'
    },
    {
      type: 'question',
      question: 'Which layer in a neural network is responsible for receiving the initial data?',
      options: ['Hidden Layer', 'Output Layer', 'Input Layer', 'Processing Layer'],
      correctAnswer: 2
    },
    {
      type: 'text',
      content: 'Training a neural network involves adjusting weights through backpropagation and gradient descent to minimize the loss function and improve prediction accuracy.'
    }
  ];

  const scriptSections = [
    {
      timestamp: '0:00 - 5:00',
      content: 'Welcome everyone to today\'s session on Neural Networks. Today we\'re going to dive deep into how neural networks work, their architecture, and practical applications. Let\'s start by understanding what neural networks are and why they\'re so powerful in modern AI.'
    },
    {
      timestamp: '5:00 - 15:00',
      content: 'Neural networks are inspired by the human brain. Just like our brain has billions of neurons connected together, artificial neural networks have nodes organized in layers. Each connection has a weight that gets adjusted during training. Let me show you a visual representation of this architecture.'
    },
    {
      timestamp: '15:00 - 30:00',
      content: 'Now let\'s talk about the layers. The input layer receives your data - for example, pixel values from an image. The hidden layers process this information through mathematical transformations. Finally, the output layer gives you the result, like identifying what object is in the image.'
    },
    {
      timestamp: '30:00 - 45:00',
      content: 'The training process is fascinating. We use forward propagation to make predictions, calculate how wrong we are using a loss function, then use backpropagation to adjust the weights. This happens thousands of times until the network becomes accurate.'
    },
    {
      timestamp: '45:00 - 60:00',
      content: 'Let\'s look at real-world applications. Neural networks power image recognition in your phone, language translation, recommendation systems, and even self-driving cars. Now, let\'s do a hands-on exercise where you\'ll build your first simple neural network.'
    }
  ];

  const handleCreateContent = () => {
    setShowOutlineTag(true);
    setInputValue('Help me generate the exact interactive content for this session, my specific demand is: ');
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setHasContent(true);
      setShowOutlineTag(false);
      setInputValue('');
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = () => {
    // Logic to delete session
    console.log('Session deleted');
    setShowDeleteConfirmation(false);
    onBack(); // Navigate back after deletion
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

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

  return (
    <>
      <Navigation userName={teacherData.name} userAvatar={teacherData.avatar} organization={teacherData.organization} onNavigateToHome={onBack} onNavigateToNotifications={onNavigateToNotifications} onNavigateToSettings={onNavigateToSettings} onNavigateToDiscussions={onNavigateToDiscussions} />
      
      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#3FA11B] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Dashboard</span>
            </button>

            {/* Session Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm relative">
              <button
                onClick={handleDelete}
                className="absolute top-6 right-6 size-10 rounded-xl border-2 border-red-500 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="size-5" />
              </button>
              <h1 className="font-['Slackey:Regular',sans-serif] text-[#3FA11B] text-[36px] leading-[1.1] mb-2 pr-16">
                {sessionData.title}
              </h1>
              <p className="text-[#B882B1] text-[18px] mb-4">{sessionData.className}</p>
              <div className="flex items-center gap-6 text-[#6a7282] text-[14px]">
                <span>{sessionData.date}</span>
                <span>{sessionData.time}</span>
                <span>{sessionData.duration}</span>
                <span>{sessionData.location}</span>
              </div>
            </div>

            {!hasContent ? (
              /* No Content - Show Outline */
              <div className="bg-white rounded-3xl p-8 shadow-sm">
                <h2 className="font-['Slackey:Regular',sans-serif] text-[#101828] text-[24px] mb-6">
                  Session Outline
                </h2>

                {/* Mind Map Style Outline */}
                <div className="space-y-4 mb-8">
                  {outline.map((section, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="size-8 rounded-full bg-[#3FA11B] flex items-center justify-center text-white text-[14px]">
                          {index + 1}
                        </div>
                        {index < outline.length - 1 && (
                          <div className="w-0.5 flex-1 bg-[#3FA11B] mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <h3 className="text-[18px] text-[#101828] mb-2">{section.title}</h3>
                        <ul className="space-y-1">
                          {section.subtopics.map((subtopic, subIndex) => (
                            <li key={subIndex} className="flex items-center gap-2 text-[14px] text-[#6a7282]">
                              <div className="size-1.5 rounded-full bg-[#3FA11B]" />
                              {subtopic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create Content Button */}
                <button
                  onClick={handleCreateContent}
                  className="w-full bg-[#3FA11B] text-white py-4 rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-[16px] shadow-lg"
                >
                  <Sparkles className="size-5" />
                  Generate Interactive Content
                </button>
              </div>
            ) : (
              /* Has Content - Show Content/Script */
              <>
                {/* Mode Toggle */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setViewMode('content')}
                    className={`px-6 py-3 rounded-xl text-[14px] transition-all ${
                      viewMode === 'content'
                        ? 'bg-[#3FA11B] text-white shadow-md'
                        : 'bg-white text-[#6a7282] hover:bg-gray-50'
                    }`}
                  >
                    Interactive Content
                  </button>
                  <button
                    onClick={() => setViewMode('script')}
                    className={`px-6 py-3 rounded-xl text-[14px] transition-all ${
                      viewMode === 'script'
                        ? 'bg-[#3FA11B] text-white shadow-md'
                        : 'bg-white text-[#6a7282] hover:bg-gray-50'
                    }`}
                  >
                    Teaching Script
                  </button>
                </div>

                {viewMode === 'content' ? (
                  /* Content Modules */
                  <div className="bg-white rounded-3xl p-8 shadow-sm space-y-6">
                    {contentModules.map((module, index) => (
                      <div key={index}>
                        {module.type === 'text' ? (
                          <div className="p-6 bg-[#F5F5F5] rounded-2xl">
                            <p className="text-[16px] text-[#101828] leading-relaxed">
                              {module.content}
                            </p>
                          </div>
                        ) : (
                          <div className="p-6 bg-[#E8F5E9] rounded-2xl border-2 border-[#3FA11B]">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="size-8 rounded-lg bg-[#3FA11B] flex items-center justify-center text-white text-[14px]">
                                Q
                              </div>
                              <p className="text-[16px] text-[#101828]">{module.question}</p>
                            </div>
                            <div className="space-y-2">
                              {module.options?.map((option, optIndex) => (
                                <button
                                  key={optIndex}
                                  className="w-full text-left px-4 py-3 rounded-xl bg-white hover:bg-[#3FA11B] hover:text-white transition-all text-[14px] text-[#101828]"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Script Sections */
                  <div className="bg-white rounded-3xl p-8 shadow-sm space-y-4">
                    {scriptSections.map((section, index) => (
                      <div key={index} className="p-6 bg-[#F5F5F5] rounded-2xl">
                        <p className="text-[#3FA11B] text-[14px] mb-2">{section.timestamp}</p>
                        <p className="text-[16px] text-[#101828] leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI Chatbot Sidebar with Outline Tag */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <AIChatbot 
              showOutlineTag={showOutlineTag}
              outlineTitle={sessionData.title}
              onRemoveOutlineTag={() => setShowOutlineTag(false)}
              prefilledInput={inputValue}
              onInputChange={setInputValue}
              onSendMessage={handleSendMessage}
              initialContext={{ id: sessionId, title: sessionData.title, type: 'session' }}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={cancelDelete}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-2xl w-[360px]"
            >
              <h3 className="font-['Slackey:Regular',sans-serif] text-[#3FA11B] text-[24px] leading-[1.1] mb-3 text-center">
                Confirm Delete
              </h3>
              <p className="text-[#6a7282] text-[15px] mb-8 text-center">
                Are you sure you want to delete this session?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-6 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-[14px] hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2.5 rounded-xl bg-red-500 text-white text-[14px] hover:opacity-90 transition-opacity shadow-md"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}