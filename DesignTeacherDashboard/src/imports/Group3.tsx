import svgPaths from "./svg-3223t53rgb";
import imgInitials from "figma:asset/92bb511a3d762c01cf089f7c1249f65c514bddd9.png";

function Initials() {
  return <div className="bg-[#dddee1] overflow-clip rounded-[24px] shrink-0 size-[32px]" data-name="Initials" />;
}

function AvatarBase() {
  return (
    <div className="absolute bottom-0 content-stretch flex items-center left-1/2 top-0 translate-x-[-50%]" data-name="_Avatar/Base">
      <Initials />
    </div>
  );
}

function IonIconFFlashDefault() {
  return (
    <div className="absolute inset-1/4" data-name="IONIcon/F/flash/default">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="IONIcon/F/flash/default">
          <path d={svgPaths.p216a41e0} fill="var(--fill-0, #515669)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function AvatarSystem() {
  return (
    <div className="relative shrink-0 size-[32px]" data-name="AvatarSystem">
      <AvatarBase />
      <IonIconFFlashDefault />
    </div>
  );
}

function AvatarContainer() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="avatarContainer">
      <AvatarSystem />
    </div>
  );
}

function SubjectLineContainer() {
  return (
    <div className="basis-0 content-stretch flex grow items-center min-h-px min-w-px relative shrink-0" data-name="subjectLineContainer">
      <p className="basis-0 font-['Inter:Medium',sans-serif] font-medium grow leading-[20px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1f36] text-[0px] text-[14px]">
        <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold">New Account</span>
        <span className="font-['Inter:Regular',sans-serif] font-normal">{` created`}</span>
      </p>
    </div>
  );
}

function SystemAndSubjectContainer() {
  return (
    <div className="relative shrink-0 w-full" data-name="systemAndSubjectContainer">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[16px] py-0 relative w-full">
          <AvatarContainer />
          <SubjectLineContainer />
        </div>
      </div>
    </div>
  );
}

function TimestampContainer() {
  return (
    <div className="relative shrink-0 w-full" data-name="timestampContainer">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[64px] pr-0 py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#a5acb8] text-[14px] text-nowrap whitespace-pre">Last Wednesday at 9:42 AM</p>
        </div>
      </div>
    </div>
  );
}

function NotificationCellMobile() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[8px] items-start px-0 py-[16px] relative shrink-0 w-[440px]" data-name="_NotificationCell/Mobile">
      <SystemAndSubjectContainer />
      <TimestampContainer />
      <div className="absolute bg-[#e4e8ee] bottom-0 h-px left-0 right-0" />
    </div>
  );
}

function Frame6() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 top-0">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1a1f36] text-[14px] text-nowrap whitespace-pre">System Notification</p>
      <NotificationCellMobile />
    </div>
  );
}

function Initials1() {
  return (
    <div className="overflow-clip relative rounded-[24px] shrink-0 size-[32px]" data-name="Initials">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none rounded-[24px] size-full" src={imgInitials} />
    </div>
  );
}

function AvatarBase1() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="_Avatar/Base">
      <Initials1 />
    </div>
  );
}

function Avatar() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Avatar">
      <AvatarBase1 />
    </div>
  );
}

function AvatarContainer1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="avatarContainer">
      <Avatar />
    </div>
  );
}

function SubjectLineContainer1() {
  return (
    <div className="basis-0 content-stretch flex grow items-center min-h-px min-w-px relative shrink-0" data-name="subjectLineContainer">
      <p className="basis-0 font-['Inter:Medium',sans-serif] font-medium grow leading-[20px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1f36] text-[0px] text-[14px] whitespace-pre-wrap">
        <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold">Dennis Nedry</span> <span className="font-['Inter:Regular',sans-serif] font-normal">comment</span>
        <span className="font-['Inter:Regular',sans-serif] font-normal">ed</span>
        <span className="font-['Inter:Regular',sans-serif] font-normal">{` on`}</span> <span className="font-['Inter:Bold',sans-serif] font-bold">{`Isla Nublar SOC2 compliance report    `}</span>
      </p>
    </div>
  );
}

function AvatarAndSubjectContainer() {
  return (
    <div className="relative shrink-0 w-full" data-name="avatarAndSubjectContainer">
      <div className="size-full">
        <div className="content-stretch flex gap-[16px] items-start px-[16px] py-0 relative w-full">
          <AvatarContainer1 />
          <SubjectLineContainer1 />
        </div>
      </div>
    </div>
  );
}

function TimestampContainer1() {
  return (
    <div className="relative shrink-0 w-full" data-name="timestampContainer">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[64px] pr-0 py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#a5acb8] text-[14px] text-nowrap whitespace-pre">Last Wednesday at 9:42 AM</p>
        </div>
      </div>
    </div>
  );
}

function NotificationCellMobile1() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[8px] items-start px-0 py-[16px] relative shrink-0 w-[440px]" data-name="_NotificationCell/Mobile">
      <AvatarAndSubjectContainer />
      <TimestampContainer1 />
      <div className="absolute bg-[#e4e8ee] bottom-0 h-px left-0 right-0" />
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 top-[136px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1a1f36] text-[14px] text-nowrap whitespace-pre">User Comment</p>
      <NotificationCellMobile1 />
    </div>
  );
}

function IsReadIndicator() {
  return (
    <div className="absolute h-[8px] left-0 top-[8px] w-[16px]" data-name="isReadIndicator">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 8">
        <g id="isReadIndicator">
          <circle cx="12" cy="4" fill="var(--fill-0, #90CDF4)" id="Ellipse 2" r="3.5" stroke="var(--stroke-0, #4299E1)" />
        </g>
      </svg>
    </div>
  );
}

function Initials2() {
  return (
    <div className="overflow-clip relative rounded-[24px] shrink-0 size-[32px]" data-name="Initials">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none rounded-[24px] size-full" src={imgInitials} />
    </div>
  );
}

function AvatarBase2() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="_Avatar/Base">
      <Initials2 />
    </div>
  );
}

function Avatar1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Avatar">
      <AvatarBase2 />
    </div>
  );
}

function AvatarContainer2() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="avatarContainer">
      <Avatar1 />
    </div>
  );
}

function SubjectLineContainer2() {
  return (
    <div className="basis-0 content-stretch flex grow items-center min-h-px min-w-px relative shrink-0" data-name="subjectLineContainer">
      <p className="basis-0 font-['Inter:Medium',sans-serif] font-medium grow leading-[20px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1f36] text-[0px] text-[14px]">
        <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold">Dennis Nedry</span> <span className="font-['Inter:Regular',sans-serif] font-normal">replied to</span> <span className="font-['Inter:Bold',sans-serif] font-bold">Anna Srzand</span>
      </p>
    </div>
  );
}

function AvatarAndSubjectContainer1() {
  return (
    <div className="relative shrink-0 w-full" data-name="avatarAndSubjectContainer">
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[16px] items-center px-[16px] py-0 relative w-full">
          <AvatarContainer2 />
          <SubjectLineContainer2 />
        </div>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="basis-0 content-stretch flex gap-[8px] grow items-start min-h-px min-w-px relative shrink-0">
      <div className="bg-[#dddee1] rounded-[2px] self-stretch shrink-0 w-[4px]" />
      <p className="-webkit-box basis-0 font-['Inter:Medium',sans-serif] font-medium grow h-[40px] leading-[20px] min-h-px min-w-px not-italic overflow-ellipsis overflow-hidden relative shrink-0 text-[#1a1f36] text-[14px] whitespace-pre-wrap">{`“Oh, I finished de-bugging the phones, but the system's compiling for eighteen minutes, or twenty.  So, some minor systems may go on and off for a while.”`}</p>
    </div>
  );
}

function BlockQuoteContainer() {
  return (
    <div className="relative shrink-0 w-full" data-name="blockQuoteContainer">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center pl-[64px] pr-[16px] py-0 relative w-full">
          <Frame7 />
        </div>
      </div>
    </div>
  );
}

function TimestampContainer2() {
  return (
    <div className="relative shrink-0 w-full" data-name="timestampContainer">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[64px] pr-0 py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#a5acb8] text-[14px] text-nowrap whitespace-pre">Last Wednesday at 9:42 AM</p>
        </div>
      </div>
    </div>
  );
}

function NotificationCellMobile2() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[8px] items-start px-0 py-[16px] relative shrink-0 w-[440px]" data-name="_NotificationCell/Mobile">
      <IsReadIndicator />
      <AvatarAndSubjectContainer1 />
      <BlockQuoteContainer />
      <TimestampContainer2 />
      <div className="absolute bg-[#e4e8ee] bottom-0 h-px left-0 right-0" />
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 top-[280px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1a1f36] text-[14px] text-nowrap whitespace-pre">Reply to comment, Unread</p>
      <NotificationCellMobile2 />
    </div>
  );
}

function Initials3() {
  return (
    <div className="overflow-clip relative rounded-[24px] shrink-0 size-[32px]" data-name="Initials">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none rounded-[24px] size-full" src={imgInitials} />
    </div>
  );
}

function AvatarBase3() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="_Avatar/Base">
      <Initials3 />
    </div>
  );
}

function Avatar2() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Avatar">
      <AvatarBase3 />
    </div>
  );
}

function AvatarContainer3() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="avatarContainer">
      <Avatar2 />
    </div>
  );
}

function SubjectLineContainer3() {
  return (
    <div className="basis-0 content-stretch flex grow items-center min-h-px min-w-px relative shrink-0" data-name="subjectLineContainer">
      <p className="basis-0 font-['Inter:Medium',sans-serif] font-medium grow leading-[20px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1f36] text-[0px] text-[14px]">
        <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold">Dennis Nedry</span> <span className="font-['Inter:Regular',sans-serif] font-normal">requested access to</span> <span className="font-['Inter:Bold',sans-serif] font-bold">Isla Nublar SOC2 compliance report</span>
      </p>
    </div>
  );
}

function AvatarAndSubjectContainer2() {
  return (
    <div className="relative shrink-0 w-full" data-name="avatarAndSubjectContainer">
      <div className="size-full">
        <div className="content-stretch flex gap-[16px] items-start px-[16px] py-0 relative w-full">
          <AvatarContainer3 />
          <SubjectLineContainer3 />
        </div>
      </div>
    </div>
  );
}

function ButtonText() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="ButtonText">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[14px] text-center text-nowrap text-white">
        <p className="leading-[20px] whitespace-pre">Approve</p>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
      <ButtonText />
    </div>
  );
}

function ButtonBase() {
  return (
    <div className="bg-[#e95744] content-stretch flex h-[28px] items-center justify-center overflow-clip px-[8px] py-[3px] relative rounded-[6px] shrink-0" data-name="_Button/Base">
      <Frame4 />
    </div>
  );
}

function Button() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Button">
      <ButtonBase />
    </div>
  );
}

function ButtonText1() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="ButtonText">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[#3c4257] text-[14px] text-center text-nowrap">
        <p className="leading-[20px] whitespace-pre">Decline</p>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
      <ButtonText1 />
    </div>
  );
}

function ButtonBase1() {
  return (
    <div className="bg-white h-[28px] relative rounded-[6px] shrink-0" data-name="_Button/Base">
      <div className="content-stretch flex h-[28px] items-center justify-center overflow-clip px-[8px] py-[3px] relative rounded-[inherit]">
        <Frame5 />
      </div>
      <div aria-hidden="true" className="absolute border border-[#dddee1] border-solid inset-0 pointer-events-none rounded-[6px]" />
    </div>
  );
}

function Button1() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Button">
      <ButtonBase1 />
    </div>
  );
}

function ActionContainer() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0" data-name="ActionContainer">
      <Button />
      <Button1 />
    </div>
  );
}

function ActionContainer1() {
  return (
    <div className="content-stretch flex gap-[8px] items-start pl-[64px] pr-0 py-0 relative shrink-0" data-name="ActionContainer">
      <ActionContainer />
    </div>
  );
}

function TimestampContainer3() {
  return (
    <div className="relative shrink-0 w-full" data-name="timestampContainer">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[64px] pr-0 py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#a5acb8] text-[14px] text-nowrap whitespace-pre">Last Wednesday at 9:42 AM</p>
        </div>
      </div>
    </div>
  );
}

function NotificationCellMobile3() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[8px] items-start px-0 py-[16px] relative shrink-0 w-[440px]" data-name="_NotificationCell/Mobile">
      <AvatarAndSubjectContainer2 />
      <ActionContainer1 />
      <TimestampContainer3 />
      <div className="absolute bg-[#e4e8ee] bottom-0 h-px left-0 right-0" />
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 top-[464px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1a1f36] text-[14px] text-nowrap whitespace-pre">Requested access</p>
      <NotificationCellMobile3 />
    </div>
  );
}

function IsReadIndicator1() {
  return (
    <div className="absolute h-[8px] left-0 top-[8px] w-[16px]" data-name="isReadIndicator">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 8">
        <g id="isReadIndicator">
          <circle cx="12" cy="4" fill="var(--fill-0, #90CDF4)" id="Ellipse 2" r="3.5" stroke="var(--stroke-0, #4299E1)" />
        </g>
      </svg>
    </div>
  );
}

function Initials4() {
  return (
    <div className="overflow-clip relative rounded-[24px] shrink-0 size-[32px]" data-name="Initials">
      <img alt="" className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none rounded-[24px] size-full" src={imgInitials} />
    </div>
  );
}

function AvatarBase4() {
  return (
    <div className="content-stretch flex items-center relative shrink-0" data-name="_Avatar/Base">
      <Initials4 />
    </div>
  );
}

function Avatar3() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="Avatar">
      <AvatarBase4 />
    </div>
  );
}

function AvatarContainer4() {
  return (
    <div className="content-stretch flex items-start relative shrink-0" data-name="avatarContainer">
      <Avatar3 />
    </div>
  );
}

function SubjectLineContainer4() {
  return (
    <div className="basis-0 content-stretch flex grow items-center min-h-px min-w-px relative shrink-0" data-name="subjectLineContainer">
      <p className="basis-0 font-['Inter:Medium',sans-serif] font-medium grow leading-[20px] min-h-px min-w-px not-italic relative shrink-0 text-[#1a1f36] text-[0px] text-[14px] whitespace-pre-wrap">
        <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold">Dennis Nedry</span> <span className="font-['Inter:Regular',sans-serif] font-normal">attached a file to</span> <span className="font-['Inter:Bold',sans-serif] font-bold">{`Isla Nublar SOC2 compliance report    `}</span>
      </p>
    </div>
  );
}

function AvatarAndSubjectContainer3() {
  return (
    <div className="relative shrink-0 w-full" data-name="avatarAndSubjectContainer">
      <div className="size-full">
        <div className="content-stretch flex gap-[16px] items-start px-[16px] py-0 relative w-full">
          <AvatarContainer4 />
          <SubjectLineContainer4 />
        </div>
      </div>
    </div>
  );
}

function FileType() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <div className="absolute flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] left-1/2 not-italic text-[#00ac54] text-[8px] text-center text-nowrap top-1/2 translate-x-[-50%] translate-y-[-50%]">
        <p className="leading-[18px] whitespace-pre">XLS</p>
      </div>
    </div>
  );
}

function IonIconRReaderDefault() {
  return (
    <div className="absolute left-[5px] size-[12px] top-[5px]" data-name="IONIcon/R/reader/default">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="IONIcon/R/reader/default">
          <path d={svgPaths.p139c2d00} fill="var(--fill-0, #5380C0)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function FileType1() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <IonIconRReaderDefault />
    </div>
  );
}

function IonIconIImageSharp() {
  return (
    <div className="absolute left-[5px] size-[12px] top-[5px]" data-name="IONIcon/I/image/sharp">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="IONIcon/I/image/sharp">
          <path d={svgPaths.p2f18c200} fill="var(--fill-0, #809BBE)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function FileType2() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <IonIconIImageSharp />
    </div>
  );
}

function IonIconCCaretForwardOutline() {
  return (
    <div className="absolute left-1/2 size-[12px] top-[5px] translate-x-[-50%]" data-name="IONIcon/C/caret/forward/outline">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="IONIcon/C/caret/forward/outline">
          <path d={svgPaths.p3c3a800} fill="var(--fill-0, #EE3E2C)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function FileType3() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <IonIconCCaretForwardOutline />
    </div>
  );
}

function Figma() {
  return (
    <div className="absolute h-[11.67px] left-[7.44px] top-[5.33px] w-[7.782px]" data-name="figma-1 1">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 12">
        <g clipPath="url(#clip0_26_3187)" id="figma-1 1">
          <path d={svgPaths.p1888070} fill="var(--fill-0, #1AD285)" id="path0 fill" />
          <path d={svgPaths.p63fc800} fill="var(--fill-0, #7F43FF)" id="path1 fill" />
          <path d={svgPaths.p21893600} fill="var(--fill-0, #C00045)" id="path1 fill 1" />
          <path d={svgPaths.p23c46500} fill="var(--fill-0, #FF5252)" id="path2 fill" />
          <path d={svgPaths.p129c900} fill="var(--fill-0, #00BBF5)" id="path3 fill" />
        </g>
        <defs>
          <clipPath id="clip0_26_3187">
            <rect fill="white" height="11.6704" width="7.78182" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function FileType4() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <Figma />
    </div>
  );
}

function IonIconMMusicalNotes() {
  return (
    <div className="absolute left-[5px] size-[12px] top-[5px]" data-name="IONIcon/M/musical/notes">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g id="IONIcon/M/musical/notes">
          <path d={svgPaths.p3eec3660} fill="var(--fill-0, #EA713B)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function FileType5() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <IonIconMMusicalNotes />
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute inset-[calc(25%-1px)_calc(24.78%-1px)_calc(24.97%-1px)_calc(25%-1px)]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 12">
        <g id="Group 11">
          <path d={svgPaths.p11830500} fill="var(--fill-0, #DD514C)" id="Vector" />
          <path d={svgPaths.p36f21540} fill="var(--fill-0, #DD514C)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function FileType6() {
  return (
    <div className="absolute bg-white border border-[#dddee1] border-solid inset-0 overflow-clip rounded-[4px]" data-name="FileType">
      <Group1 />
    </div>
  );
}

function FileTypeFileIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="FileType/FileIcon">
      <FileType />
      <FileType1 />
      <FileType2 />
      <FileType3 />
      <FileType4 />
      <FileType5 />
      <FileType6 />
    </div>
  );
}

function Attachment() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="attachment">
      <FileTypeFileIcon />
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1a1f36] text-[14px] text-nowrap whitespace-pre">EY_review.pdf</p>
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#a5acb8] text-[14px] text-nowrap whitespace-pre">2mb</p>
    </div>
  );
}

function TimestampContainer4() {
  return (
    <div className="relative shrink-0 w-full" data-name="timestampContainer">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[64px] pr-0 py-0 relative w-full">
          <Attachment />
        </div>
      </div>
    </div>
  );
}

function TimestampContainer5() {
  return (
    <div className="relative shrink-0 w-full" data-name="timestampContainer">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[64px] pr-0 py-0 relative w-full">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#a5acb8] text-[14px] text-nowrap whitespace-pre">Last Wednesday at 9:42 AM</p>
        </div>
      </div>
    </div>
  );
}

function NotificationCellMobile4() {
  return (
    <div className="bg-white content-stretch flex flex-col gap-[8px] items-start px-0 py-[16px] relative shrink-0 w-[440px]" data-name="_NotificationCell/Mobile">
      <IsReadIndicator1 />
      <AvatarAndSubjectContainer3 />
      <TimestampContainer4 />
      <TimestampContainer5 />
      <div className="absolute bg-[#e4e8ee] bottom-0 h-px left-0 right-0" />
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-0 top-[644px]">
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#1a1f36] text-[14px] text-nowrap whitespace-pre">Attached a file, Unread</p>
      <NotificationCellMobile4 />
    </div>
  );
}

export default function Group() {
  return (
    <div className="relative size-full">
      <Frame6 />
      <Frame />
      <Frame1 />
      <Frame2 />
      <Frame3 />
    </div>
  );
}