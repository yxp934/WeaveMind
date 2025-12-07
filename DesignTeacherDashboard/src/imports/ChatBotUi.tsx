import svgPaths from "./svg-2v98ntahq0";

function Group() {
  return (
    <div className="absolute h-[464px] left-[calc(50%-10px)] top-[501px] translate-x-[-50%] w-[544px]">
      <div className="absolute inset-[-96.98%_-68.01%_-107.76%_-91.91%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1414 1414">
          <g id="Group 41">
            <g filter="url(#filter0_f_1_1453)" id="Ellipse 9">
              <circle cx="904" cy="590" fill="var(--fill-0, #89BCFF)" r="140" />
            </g>
            <g filter="url(#filter1_f_1_1453)" id="Ellipse 10">
              <circle cx="707" cy="707" fill="var(--fill-0, #FF86E1)" r="207" />
            </g>
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="880" id="filter0_f_1_1453" width="880" x="464" y="150">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur_1_1453" stdDeviation="150" />
            </filter>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1414" id="filter1_f_1_1453" width="1414" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feGaussianBlur result="effect1_foregroundBlur_1_1453" stdDeviation="250" />
            </filter>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="h-[37.828px] relative shrink-0 w-[36px]" data-name="Logo">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 38">
        <g id="Logo">
          <path d={svgPaths.p1c4d2300} fill="var(--fill-0, #160211)" id="Star 1" />
          <path d={svgPaths.p2128f680} fill="var(--fill-0, #160211)" id="Star 3" />
          <path d={svgPaths.p1c2ff500} fill="var(--fill-0, #160211)" id="Star 2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[48px] items-center left-[calc(50%-0.5px)] top-[calc(50%-192.5px)] translate-x-[-50%] translate-y-[-50%] w-[409px]">
      <Logo />
      <p className="font-['Manrope:Regular',sans-serif] font-normal leading-[normal] min-w-full relative shrink-0 text-[#160211] text-[24px] text-center w-[min-content]">Ask our AI anything</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.5)] box-border content-stretch flex gap-[10px] items-center justify-center left-[222px] p-[10px] rounded-[8px] top-[645px]">
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#160211] text-[14px] w-[274px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        What can I ask you to do?
      </p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute bg-white box-border content-stretch flex items-center justify-between left-[222px] p-[10px] rounded-[8px] top-[739px] w-[883px]">
      <div aria-hidden="true" className="absolute border border-[rgba(22,2,17,0.3)] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['Manrope:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#56637e] text-[14px] w-[274px]">Ask me anything about your projects</p>
      <div className="overflow-clip relative shrink-0 size-[36px]" data-name="Send">
        <div className="absolute inset-[1.56%_2.2%_1.52%_0.87%]" data-name="Vector">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35 35">
            <path d={svgPaths.p2f0e8d80} fill="var(--fill-0, #456288)" fillOpacity="0.5" id="Vector" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.5)] box-border content-stretch flex gap-[10px] items-center justify-center left-[530px] p-[10px] rounded-[8px] top-[645px]">
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#160211] text-[14px] w-[274px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        Which one of my projects is performing the best?
      </p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.5)] box-border content-stretch flex gap-[10px] h-[56px] items-center justify-center left-[838px] p-[10px] rounded-[8px] top-[645px]">
      <div aria-hidden="true" className="absolute border border-solid border-white inset-0 pointer-events-none rounded-[8px]" />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#160211] text-[14px] w-[247px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        What projects should I be concerned about right now?
      </p>
    </div>
  );
}

export default function ChatBotUi() {
  return (
    <div className="bg-white overflow-clip relative rounded-[32px] size-full" data-name="Chat Bot UI">
      <Group />
      <Frame />
      <Frame3 />
      <Frame4 />
      <Frame2 />
      <Frame1 />
      <p className="absolute font-['Manrope:Bold',sans-serif] font-bold leading-[normal] left-[232px] text-[#56637e] text-[14px] text-nowrap top-[610px] whitespace-pre">Suggestions on what to ask Our AI</p>
    </div>
  );
}