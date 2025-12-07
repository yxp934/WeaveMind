function Frame() {
  return (
    <div className="basis-0 content-stretch flex grow items-center justify-center min-h-px min-w-px px-0 py-[4px] relative shrink-0">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[#e4321b] text-[18px] text-center text-nowrap">
        <p className="leading-[28px] whitespace-pre">All</p>
      </div>
    </div>
  );
}

function TabBase() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[40px] items-center overflow-clip px-[32px] py-0 relative shrink-0" data-name="_Tab/Base">
      <Frame />
      <div className="bg-[#e95744] h-[3px] shadow-[0px_1px_0px_0px_#e95744] shrink-0 w-full" />
    </div>
  );
}

function Tab() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Tab">
      <TabBase />
    </div>
  );
}

function Frame2() {
  return (
    <div className="basis-0 content-stretch flex grow items-center justify-center min-h-px min-w-px px-0 py-[4px] relative shrink-0">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[#697386] text-[18px] text-center text-nowrap">
        <p className="leading-[28px] whitespace-pre">Unread</p>
      </div>
    </div>
  );
}

function TabBase1() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[40px] items-center overflow-clip pl-0 pr-[32px] py-0 relative shrink-0" data-name="_Tab/Base">
      <Frame2 />
      <div className="bg-white h-[3px] shrink-0 w-full" />
    </div>
  );
}

function Tab1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Tab">
      <TabBase1 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="basis-0 content-stretch flex grow items-center justify-center min-h-px min-w-px px-0 py-[4px] relative shrink-0">
      <div className="flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] not-italic relative shrink-0 text-[#697386] text-[18px] text-center text-nowrap">
        <p className="leading-[28px] whitespace-pre">Read</p>
      </div>
    </div>
  );
}

function TabBase2() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[40px] items-center overflow-clip pl-0 pr-[32px] py-0 relative shrink-0" data-name="_Tab/Base">
      <Frame3 />
      <div className="bg-white h-[3px] shrink-0 w-full" />
    </div>
  );
}

function Tab2() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="Tab">
      <TabBase2 />
    </div>
  );
}

function Tabs() {
  return (
    <div className="basis-0 content-stretch flex grow items-start min-h-px min-w-px relative shrink-0" data-name="Tabs">
      <Tab />
      <Tab1 />
      <Tab2 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0 w-full">
      <Tabs />
    </div>
  );
}

function Tabs1() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[40px] items-start justify-between relative shrink-0 w-[440px]" data-name="Tabs">
      <Frame1 />
      <div className="h-0 relative shrink-0 w-full">
        <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 440 1">
            <line id="Line 7" stroke="var(--stroke-0, #E4E8EE)" x2="440" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Tabs2() {
  return (
    <div className="content-stretch flex flex-col items-start relative size-full" data-name="Tabs">
      <Tabs1 />
    </div>
  );
}