import { useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Navigation from '../components/Navigation';
import AIChatbot from '../components/AIChatbot';
import FloatingActionMenu from '../components/FloatingActionMenu';
import { motion } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface SubmissionDetailProps {
  submissionId: number;
  assignmentId: number;
  onBack: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToDiscussions?: () => void;
}

export default function SubmissionDetail({ 
  submissionId, 
  assignmentId,
  onBack, 
  onNavigateToNotifications, 
  onNavigateToSettings, 
  onNavigateToDiscussions 
}: SubmissionDetailProps) {
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  const teacherData = {
    avatar: 'https://images.unsplash.com/photo-1621274790572-7c32596bc67f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzY0ODg0MTY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    name: 'Prof. Sarah Chen',
    organization: 'Stanford University'
  };

  // Mock submission data
  const submissionData = {
    id: submissionId,
    assignmentTitle: 'Neural Network Project',
    studentName: 'Michael Chen',
    studentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    submittedAt: 'Dec 08, 2024 - 9:15 AM',
    dueDate: 'Dec 10, 2024 - 11:59 PM',
    isLate: false,
    earlyByHours: 62.75, // About 2.6 days early
    abnormalBehaviors: 3,
    document: {
      title: 'Neural Network Implementation for MNIST Dataset',
      content: `
# Neural Network Implementation for MNIST Dataset

## Executive Summary

This project implements a fully connected neural network from scratch using Python and NumPy to classify handwritten digits from the MNIST dataset. The implementation achieves 94.2% accuracy on the test set after 50 epochs of training.

## Introduction

The MNIST (Modified National Institute of Standards and Technology) database is a large collection of handwritten digits commonly used for training and testing in the field of machine learning. This project demonstrates the fundamental concepts of neural networks by building one without relying on high-level frameworks like TensorFlow or PyTorch.

## Architecture Design

### Network Structure

The implemented neural network consists of three layers:

- **Input Layer**: 784 neurons (28x28 pixel images flattened)
- **Hidden Layer**: 128 neurons with ReLU activation
- **Output Layer**: 10 neurons with Softmax activation (one for each digit 0-9)

### Mathematical Foundation

The forward propagation process can be described as:

1. **First Layer**: Z₁ = W₁X + b₁
2. **ReLU Activation**: A₁ = max(0, Z₁)
3. **Output Layer**: Z₂ = W₂A₁ + b₂
4. **Softmax**: A₂ = exp(Z₂) / Σexp(Z₂)

The cross-entropy loss function is used to measure the difference between predicted and actual labels:

**Loss = -Σ(y * log(ŷ))**

## Implementation Details

### Data Preprocessing

The MNIST dataset was preprocessed with the following steps:

1. Normalization: Pixel values scaled from [0, 255] to [0, 1]
2. Flattening: 28x28 images reshaped to 784-dimensional vectors
3. One-hot encoding: Labels converted to 10-dimensional vectors

### Training Process

The network was trained using mini-batch gradient descent with the following hyperparameters:

- **Learning Rate**: 0.01
- **Batch Size**: 128
- **Epochs**: 50
- **Optimizer**: Stochastic Gradient Descent with momentum (β = 0.9)

### Backpropagation

The backpropagation algorithm computes gradients for weight updates:

1. Calculate output layer error: δ₂ = A₂ - Y
2. Compute hidden layer error: δ₁ = (W₂ᵀδ₂) ⊙ ReLU'(Z₁)
3. Update weights: W = W - α∇W
4. Update biases: b = b - α∇b

## Results and Analysis

### Training Performance

The model showed steady improvement during training:

- **Epoch 10**: Training accuracy 89.3%, Validation accuracy 88.7%
- **Epoch 25**: Training accuracy 92.8%, Validation accuracy 91.9%
- **Epoch 50**: Training accuracy 95.1%, Validation accuracy 94.2%

### Confusion Matrix Analysis

The confusion matrix revealed interesting patterns:

- Digits 0, 1, and 6 were classified with >96% accuracy
- The most common confusion was between 4 and 9 (3.2% error rate)
- Digit 8 had the lowest accuracy at 91.3%, often confused with 3 and 5

### Loss Curve

The training loss decreased smoothly from 2.31 (random initialization) to 0.18 (final epoch), indicating proper convergence without significant overfitting. The validation loss closely tracked the training loss, suggesting good generalization.

## Challenges and Solutions

### Challenge 1: Vanishing Gradients

**Problem**: Initial implementation with sigmoid activation led to vanishing gradients in deeper layers.

**Solution**: Replaced sigmoid with ReLU activation in hidden layers, which maintains stronger gradients and speeds up training.

### Challenge 2: Overfitting

**Problem**: After 30 epochs, validation accuracy plateaued while training accuracy continued to improve.

**Solution**: Implemented L2 regularization (λ = 0.001) and early stopping based on validation performance.

### Challenge 3: Slow Convergence

**Problem**: Basic gradient descent showed slow and unstable convergence.

**Solution**: Added momentum to the optimizer, which smoothed the gradient updates and accelerated convergence by 40%.

## Code Structure

The implementation consists of four main classes:

\`\`\`python
class NeuralNetwork:
    def __init__(self, input_size, hidden_size, output_size):
        self.W1 = np.random.randn(input_size, hidden_size) * 0.01
        self.b1 = np.zeros((1, hidden_size))
        self.W2 = np.random.randn(hidden_size, output_size) * 0.01
        self.b2 = np.zeros((1, output_size))
    
    def forward(self, X):
        self.Z1 = np.dot(X, self.W1) + self.b1
        self.A1 = np.maximum(0, self.Z1)
        self.Z2 = np.dot(self.A1, self.W2) + self.b2
        self.A2 = self.softmax(self.Z2)
        return self.A2
    
    def backward(self, X, Y, learning_rate):
        m = X.shape[0]
        dZ2 = self.A2 - Y
        dW2 = np.dot(self.A1.T, dZ2) / m
        db2 = np.sum(dZ2, axis=0, keepdims=True) / m
        
        dA1 = np.dot(dZ2, self.W2.T)
        dZ1 = dA1 * (self.Z1 > 0)
        dW1 = np.dot(X.T, dZ1) / m
        db1 = np.sum(dZ1, axis=0, keepdims=True) / m
        
        self.W1 -= learning_rate * dW1
        self.b1 -= learning_rate * db1
        self.W2 -= learning_rate * dW2
        self.b2 -= learning_rate * db2
\`\`\`

## Comparison with Existing Libraries

To validate the implementation, I compared the results with scikit-learn's MLPClassifier:

| Metric | Custom Implementation | scikit-learn |
|--------|----------------------|--------------|
| Accuracy | 94.2% | 94.8% |
| Training Time | 142s | 98s |
| Memory Usage | 8.3 MB | 12.1 MB |

The custom implementation achieved comparable accuracy with lower memory footprint but longer training time due to lack of low-level optimizations.

## Future Improvements

Several enhancements could further improve the model:

1. **Convolutional Layers**: Adding CNN layers would better capture spatial features in images
2. **Dropout**: Implementing dropout regularization could reduce overfitting
3. **Batch Normalization**: This would stabilize training and allow higher learning rates
4. **Learning Rate Scheduling**: Gradually reducing the learning rate could improve final accuracy
5. **Data Augmentation**: Rotating and shifting images could increase training data diversity

## Conclusion

This project successfully demonstrates the implementation of a neural network from scratch, achieving strong performance on the MNIST dataset. The implementation provides clear insights into the mathematical foundations of deep learning, including forward propagation, backpropagation, and gradient descent optimization.

Key learnings include:
- The importance of proper activation function selection
- How regularization prevents overfitting
- The impact of hyperparameter tuning on model performance

The 94.2% accuracy proves that even a simple architecture can achieve impressive results on well-structured datasets when properly implemented and trained.

## References

1. LeCun, Y., et al. (1998). "Gradient-based learning applied to document recognition"
2. Goodfellow, I., et al. (2016). "Deep Learning" (MIT Press)
3. Nielsen, M. (2015). "Neural Networks and Deep Learning"
4. Ruder, S. (2016). "An overview of gradient descent optimization algorithms"

## Appendix

### A. Complete Training Logs

[Detailed epoch-by-epoch training metrics omitted for brevity]

### B. Hyperparameter Tuning Results

Various combinations of learning rates, batch sizes, and hidden layer sizes were tested systematically to find the optimal configuration.

### C. Visualization Scripts

Python scripts for generating loss curves, confusion matrices, and accuracy plots are included in the project repository.
      `
    }
  };

  // Calculate time difference
  const getTimeStatus = () => {
    if (submissionData.isLate) {
      return {
        text: `Late by ${submissionData.earlyByHours} hours`,
        color: '#EF4444',
        icon: AlertTriangle
      };
    } else {
      const days = Math.floor(submissionData.earlyByHours / 24);
      const hours = Math.floor(submissionData.earlyByHours % 24);
      return {
        text: `Early by ${days} days ${hours} hours`,
        color: '#3FA11B',
        icon: CheckCircle
      };
    }
  };

  const timeStatus = getTimeStatus();

  const handleSubmitGrade = () => {
    if (!grade || isNaN(Number(grade)) || Number(grade) < 0 || Number(grade) > 100) {
      toast.error('Please enter a valid grade (0-100)');
      return;
    }

    // Submit grade logic here
    toast.success(`Grade ${grade} submitted successfully!`);
    setTimeout(() => {
      onBack();
    }, 1500);
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
      <Navigation 
        userName={teacherData.name} 
        userAvatar={teacherData.avatar} 
        organization={teacherData.organization} 
        onNavigateToHome={onBack} 
        onNavigateToNotifications={onNavigateToNotifications} 
        onNavigateToSettings={onNavigateToSettings} 
        onNavigateToDiscussions={onNavigateToDiscussions} 
      />
      
      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[#6a7282] hover:text-[#B882B1] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span className="text-[14px]">Back to Assignment</span>
            </button>

            {/* Submission Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <img 
                  src={submissionData.studentAvatar} 
                  alt={submissionData.studentName}
                  className="size-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <h1 className="font-['Slackey:Regular',sans-serif] text-[#B882B1] text-[32px] leading-[1.1] mb-2">
                    {submissionData.assignmentTitle}
                  </h1>
                  <p className="text-[#101828] text-[18px] mb-2">
                    Submitted by {submissionData.studentName}
                  </p>
                  <div className="flex items-center gap-4 text-[14px]">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-[#6a7282]" />
                      <span className="text-[#6a7282]">
                        {submissionData.submittedAt}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-2 gap-4">
                {/* Time Status */}
                <div className="bg-[#F9FAFB] rounded-2xl p-4 flex items-center gap-3">
                  <div 
                    className="size-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${timeStatus.color}20` }}
                  >
                    <timeStatus.icon className="size-6" style={{ color: timeStatus.color }} />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6a7282] mb-1">Submission Time</p>
                    <p className="text-[16px]" style={{ color: timeStatus.color }}>
                      {timeStatus.text}
                    </p>
                  </div>
                </div>

                {/* Abnormal Behaviors */}
                <div className="bg-[#F9FAFB] rounded-2xl p-4 flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-[#FFF3E0] flex items-center justify-center">
                    <AlertTriangle className="size-6 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6a7282] mb-1">Abnormal Behaviors</p>
                    <p className="text-[16px] text-[#F59E0B]">
                      {submissionData.abnormalBehaviors} detected
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Document */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="font-['Slackey:Regular',sans-serif] text-[#101828] text-[24px] mb-6">
                {submissionData.document.title}
              </h2>
              
              {/* Document Content with Markdown-like styling */}
              <div className="prose prose-slate max-w-none">
                <div 
                  className="text-[#101828] leading-relaxed whitespace-pre-wrap"
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.8'
                  }}
                >
                  {submissionData.document.content}
                </div>
              </div>
            </div>

            {/* Grading Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <h2 className="font-['Slackey:Regular',sans-serif] text-[#101828] text-[24px] mb-6">
                Grade Submission
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] text-[#6a7282] mb-2">
                    Grade (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Enter grade"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#B882B1] text-[16px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] text-[#6a7282] mb-2">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter feedback for the student..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#B882B1] text-[16px] resize-none"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitGrade}
                  className="w-full bg-[#B882B1] text-white py-4 rounded-2xl hover:opacity-90 transition-opacity text-[16px] shadow-lg"
                >
                  Submit Grade
                </motion.button>
              </div>
            </div>
          </div>

          {/* AI Chatbot Sidebar */}
          <div className="w-[400px] sticky top-6 h-[calc(100vh-120px)]">
            <AIChatbot 
              initialContext={{ 
                id: submissionId, 
                title: `${submissionData.studentName}'s submission`, 
                type: 'submission' 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <FloatingActionMenu sessions={upcomingSessions} />
    </>
  );
}
