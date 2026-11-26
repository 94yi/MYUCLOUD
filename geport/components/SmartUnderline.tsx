import React from 'react';

interface SmartUnderlineProps {
  label?: string;
  value: string;
  minWidth?: string; // CSS value, e.g., '200px'
  align?: 'left' | 'center' | 'right';
  className?: string;
  labelWidth?: string; // Fixed width for the label to ensure column alignment
  fontSize?: string; // Specific font size override
}

/**
 * A component that replicates the "Form Line" look.
 * It features a label (optional) and a bottom-bordered area that expands
 * to fit content but maintains a minimum width.
 */
export const SmartUnderline: React.FC<SmartUnderlineProps> = ({
  label,
  value,
  minWidth = '150px',
  align = 'center',
  className = '',
  labelWidth = 'auto',
  fontSize = 'text-[14pt]', // Default No. 4 size
}) => {
  return (
    // changed items-end to items-baseline to ensure text aligns on the baseline
    <div className={`flex items-baseline gap-2 ${className} ${fontSize}`}>
      {label && (
        <span
          className="font-serif leading-normal whitespace-nowrap font-bold flex-shrink-0"
          style={{ width: labelWidth }}
        >
          {label}
        </span>
      )}
      {/*
        The actual underline container.
        flex-grow: allows it to take remaining space if needed (optional behavior)
        min-width: ensures strict adherence to the requested line length
        pb-2: increased padding to prevent line from crossing text
        leading-normal: prevents clipping of descenders
      */}
      <div
        className="border-b-[1.5px] border-black px-2 pb-2 leading-normal text-center whitespace-pre-wrap"
        style={{
          minWidth: minWidth,
        }}
      >
        <span className="font-serif font-bold">{value || '\u00A0'}</span>
      </div>
    </div>
  );
};
