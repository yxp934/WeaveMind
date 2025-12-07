import { Mail, Phone, Building2 } from 'lucide-react';

interface ProfileCardProps {
  avatar: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  studentId: string;
}

export default function ProfileCard({ avatar, name, email, phone, organization, studentId }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow">
      <div className="flex items-start gap-4">
        <img
          src={avatar}
          alt={name}
          className="size-20 rounded-full object-cover border-4 border-[#e8f4e4]"
        />
        <div className="flex-1">
          <h3 className="text-[#101828] text-[20px] mb-1">{name}</h3>
          <p className="text-[#6a7282] text-[14px] mb-3">Student ID: {studentId}</p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#6a7282] text-[14px]">
              <Mail className="size-4" />
              <span>{email}</span>
            </div>
            <div className="flex items-center gap-2 text-[#6a7282] text-[14px]">
              <Phone className="size-4" />
              <span>{phone}</span>
            </div>
            <div className="flex items-center gap-2 text-[#6a7282] text-[14px]">
              <Building2 className="size-4" />
              <span>{organization}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
