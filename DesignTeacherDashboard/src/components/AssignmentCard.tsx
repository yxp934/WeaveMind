import { FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AssignmentCardProps {
  title: string;
  className: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  grade?: string;
  color: string;
}

export default function AssignmentCard({
  title,
  className,
  dueDate,
  status,
  grade,
  color
}: AssignmentCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'submitted':
        return {
          icon: CheckCircle,
          text: 'Submitted',
          color: '#3fa11b',
          bg: '#e8f4e4'
        };
      case 'graded':
        return {
          icon: CheckCircle,
          text: `Graded: ${grade}`,
          color: '#3fa11b',
          bg: '#e8f4e4'
        };
      case 'overdue':
        return {
          icon: AlertCircle,
          text: 'Overdue',
          color: '#dc2626',
          bg: '#fee2e2'
        };
      default:
        return {
          icon: Clock,
          text: 'Pending',
          color: '#f59e0b',
          bg: '#fef3c7'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-[10px] border border-gray-200 p-4 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-start gap-3">
        <div
          className="size-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <FileText className="size-5" style={{ color }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h5 className="text-[#101828] text-[15px] mb-1 truncate">{title}</h5>
          <p className="text-[#6a7282] text-[13px] mb-2">{className}</p>
          
          <div className="flex items-center justify-between">
            <p className="text-[#6a7282] text-[13px]">Due: {dueDate}</p>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded text-[12px]"
              style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
            >
              <StatusIcon className="size-3.5" />
              <span>{statusConfig.text}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
