interface RetroTitleProps {
  text: string;
  className?: string;
  color?: string;
}

export function RetroTitle({ text, className = '', color = '#B882B1' }: RetroTitleProps) {
  return (
    <div className={`relative inline-block ${className}`} style={{ minHeight: '1.2em' }}>
      {/* Layer 1 - Semi-transparent */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%] opacity-50">
        <div className="flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-center text-nowrap" style={{ color }}>
          <p className="leading-[normal] whitespace-pre text-4xl">{text}</p>
        </div>
      </div>

      {/* Layer 2 - Full opacity */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%]">
        <div className="flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-center text-nowrap" style={{ color }}>
          <p className="leading-[normal] whitespace-pre text-4xl">{text}</p>
        </div>
      </div>

      {/* Layer 3 - Darker shade */}
      <div className="absolute left-[calc(50%-0.04px)] top-[calc(50%-0.5px)] translate-x-[-50%] translate-y-[-50%]">
        <div className="flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-center text-nowrap" style={{
          color: color === '#B882B1' ? '#8B5A8C' : color === '#3FA11B' ? '#2D8A15' : color
        }}>
          <p className="leading-[normal] whitespace-pre text-4xl">{text}</p>
        </div>
      </div>

      {/* Invisible text to maintain layout space */}
      <div className="invisible flex flex-col font-[var(--font-slackey),sans-serif] justify-center leading-[0] not-italic text-center text-nowrap">
        <p className="leading-[normal] whitespace-pre text-4xl">{text}</p>
      </div>
    </div>
  );
}
