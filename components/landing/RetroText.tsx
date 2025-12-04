interface RetroTextProps {
  text: string;
}

export function RetroText({ text }: RetroTextProps) {
  return (
    <div className="relative inline-block" style={{ minHeight: '1.2em' }}>
      {/* Layer 1 - Semi-transparent */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%] opacity-50">
        <div className="flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-[#3fa11b] text-center text-nowrap">
          <p className="leading-[normal] whitespace-pre">{text}</p>
        </div>
      </div>

      {/* Layer 2 - Full opacity, same color */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%]">
        <div className="flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-[#3fa11b] text-center text-nowrap">
          <p className="leading-[normal] whitespace-pre">{text}</p>
        </div>
      </div>

      {/* Layer 3 - Darker shade */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%]">
        <div className="flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-[#1f5a0f] text-center text-nowrap">
          <p className="leading-[normal] whitespace-pre">{text}</p>
        </div>
      </div>

      {/* Invisible text to maintain layout space */}
      <div className="invisible flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-center text-nowrap">
        <p className="leading-[normal] whitespace-pre">{text}</p>
      </div>
    </div>
  );
}
