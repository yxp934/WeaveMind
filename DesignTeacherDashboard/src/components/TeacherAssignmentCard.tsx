import { FileText, Users } from 'lucide-react';

interface TeacherAssignmentCardProps {
  title: string;
  className: string;
  dueDate: string;
  totalStudents: number;
  submittedCount: number;
  color: string;
}

export default function TeacherAssignmentCard({
  title,
  className,
  dueDate,
  totalStudents,
  submittedCount,
  color
}: TeacherAssignmentCardProps) {
  const submissionRate = Math.round((submittedCount / totalStudents) * 100);

  return (
    <div className="bg-white rounded-[8px] border border-gray-200 p-2.5 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-start gap-2">
        <div
          className="size-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <FileText className="size-3.5" style={{ color }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h5 className="text-[#101828] text-[12px] mb-0.5 truncate">{title}</h5>
          <p className="text-[#6a7282] text-[10px] mb-1.5">{className}</p>
          
          <div className="flex items-center gap-1.5 text-[10px] text-[#6a7282] mb-1.5">
            <span>Due: {dueDate}</span>
          </div>
          
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1 text-[#6a7282]">
                <Users className="size-3" />
                <span>Submissions</span>
              </div>
              <span className="text-[#101828]">{submittedCount}/{totalStudents}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${submissionRate}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}