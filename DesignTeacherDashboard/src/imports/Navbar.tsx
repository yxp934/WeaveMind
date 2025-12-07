import svgPaths from "./svg-7zsey0af3k";
import imgProfilePic from "figma:asset/ccea4943fb9efbfb51b39b483bd85e39ed527d1d.png";

function Profile() {
  return (
    <div className="absolute contents right-[50.07px] top-1/2 translate-y-[-50%]" data-name="Profile">
      <div className="absolute pointer-events-none right-[71px] rounded-[100px] size-[50px] top-1/2 translate-y-[-50%]" data-name="profile-pic">
        <div className="absolute inset-0 overflow-hidden rounded-[100px]">
          <img alt="" className="absolute h-[200%] left-[-24.99%] max-w-none top-[0.1%] w-[160%]" src={imgProfilePic} />
        </div>
        <div aria-hidden="true" className="absolute border border-solid border-white inset-[-1px] rounded-[101px]" />
      </div>
      <div className="absolute h-[6px] right-[50.07px] top-1/2 translate-y-[-50%] w-[6.928px]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 6">
          <path d={svgPaths.p248b9300} fill="var(--fill-0, #808080)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute inset-[8.33%_12.5%_8.35%_12.5%]" data-name="Group">
      <div className="absolute inset-[-5%_-5.56%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 22">
          <g id="Group">
            <path d={svgPaths.p76feb0} id="Vector" stroke="var(--stroke-0, #808080)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d={svgPaths.p9601900} id="Vector_2" stroke="var(--stroke-0, #808080)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Bell() {
  return (
    <div className="absolute left-[1265px] overflow-clip size-[24px] top-[30px]" data-name="bell">
      <Group />
    </div>
  );
}

function Notificatios() {
  return (
    <div className="absolute contents left-[1265px] top-[23px]" data-name="Notificatios">
      <Bell />
      <div className="absolute left-[1274px] size-[15px] top-[23px]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15 15">
          <circle cx="7.5" cy="7.5" fill="var(--fill-0, #1682FD)" id="Ellipse 1" r="6.5" stroke="var(--stroke-0, white)" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

function PlusCircle() {
  return (
    <div className="relative shrink-0 size-[13px]" data-name="plus-circle">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 13">
        <g clipPath="url(#clip0_26_4003)" id="plus-circle">
          <path d={svgPaths.p1d11280} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.5 4.33333V8.66667" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.33333 6.5H8.66667" id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_26_4003">
            <rect fill="white" height="13" width="13" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-[#f48023] content-stretch flex gap-[12px] items-center left-[1086px] overflow-clip px-[20px] py-[12px] rounded-[5px] top-[23px]" data-name="Button">
      <PlusCircle />
      <div className="flex flex-col font-['Roboto:Black',sans-serif] font-black justify-center leading-[0] relative shrink-0 text-[12px] text-nowrap text-white tracking-[0.24px]" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="leading-[normal] whitespace-pre">Ask a question</p>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute contents left-[50px] top-[calc(50%-0.2px)] translate-y-[-50%]" data-name="icon">
      <div className="absolute flex h-[10.565px] items-center justify-center left-[50px] top-[calc(50%+9.32px)] translate-y-[-50%] w-[23.753px]">
        <div className="flex-none scale-y-[-100%]">
          <div className="h-[10.565px] relative w-[23.753px]" data-name="Vector">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 11">
              <path d={svgPaths.p913800} fill="var(--fill-0, #BCBBBC)" id="Vector" />
            </svg>
          </div>
        </div>
      </div>
      <div className="absolute flex h-[24.317px] items-center justify-center left-[55.28px] top-[calc(50%-2.84px)] translate-y-[-50%] w-[19.715px]">
        <div className="flex-none scale-y-[-100%]">
          <div className="h-[24.317px] relative w-[19.715px]" data-name="Vector">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 25">
              <path d={svgPaths.p4488a00} fill="var(--fill-0, #F48023)" id="Vector" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="absolute contents left-[50px] top-[calc(50%-0.2px)] translate-y-[-50%]" data-name="Logo">
      <div className="absolute flex flex-col font-['Roboto:Regular',sans-serif] font-normal justify-center leading-[0] left-[90px] text-[16px] text-black text-nowrap top-[calc(50%+3.5px)] tracking-[0.8px] translate-y-[-50%]" style={{ fontVariationSettings: "'wdth' 100" }}>
        <p className="leading-[normal] whitespace-pre">
          alem
          <span className="font-['Roboto:Black',sans-serif] font-black" style={{ fontVariationSettings: "'wdth' 100" }}>
            help
          </span>
        </p>
      </div>
      <Icon />
    </div>
  );
}

function Karma() {
  return (
    <div className="absolute bg-[#f48023] left-[1353px] rounded-[10px] top-[17px]" data-name="Karma">
      <div className="content-stretch flex items-center overflow-clip px-[5px] py-[2px] relative rounded-[inherit]">
        <div className="flex flex-col font-['Roboto:Medium',sans-serif] font-medium h-[11px] justify-center leading-[0] relative shrink-0 text-[10px] text-center text-white tracking-[0.5px] w-[6px]" style={{ fontVariationSettings: "'wdth' 100" }}>
          <p className="leading-[normal]">0</p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

export default function Navbar() {
  return (
    <div className="bg-white relative size-full" data-name="Navbar">
      <div className="relative size-full">
        <Profile />
        <Notificatios />
        <Button />
        <div className="absolute capitalize flex flex-col font-['Roboto:Black',sans-serif] font-black justify-center leading-[0] left-[360px] text-[18px] text-[grey] text-nowrap top-[41.5px] tracking-[0.9px] translate-y-[-50%]" style={{ fontVariationSettings: "'wdth' 100" }}>
          <p className="leading-[normal] whitespace-pre">Questions</p>
        </div>
        <Logo />
        <Karma />
      </div>
      <div aria-hidden="true" className="absolute border border-[#eaeaea] border-solid inset-[-1px] pointer-events-none" />
    </div>
  );
}