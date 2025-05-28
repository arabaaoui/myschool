import React, { useState, useEffect, useRef } from 'react';
// Manually import the JSON. In a larger app, you might use a context or a dedicated loader.
import helpData from '../../helpContent.json';

interface HelpTooltipProps {
  helpKey: keyof typeof helpData; // Enforce helpKey to be a valid key from helpContent.json
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string; // For additional styling of the icon container
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({
  helpKey,
  position = 'right',
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [helpText, setHelpText] = useState('');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Fetch help text based on helpKey
    // Type assertion as helpKey is guaranteed to be a key of helpData
    const text = helpData[helpKey] as string | undefined;
    setHelpText(text || 'Help content not found.');
  }, [helpKey]);

  // Handle clicks outside the tooltip to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showTooltip &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        iconRef.current &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  const toggleTooltip = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event from bubbling up to document mousedown listener immediately
    setShowTooltip(!showTooltip);
  };

  // Calculate tooltip position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
      default:
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        ref={iconRef}
        type="button" // Important for forms
        onClick={toggleTooltip}
        className="p-1 rounded-full text-xs text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
        aria-label={`Help for ${helpKey}`}
      >
        {/* Simple text-based icon */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>

      </button>

      {showTooltip && (
        <div
          ref={tooltipRef}
          // Tailwind classes for tooltip appearance and positioning
          className={`absolute z-10 w-64 p-3 text-sm text-white bg-gray-800 rounded-lg shadow-lg ${getPositionClasses()}`}
          role="tooltip"
        >
          {helpText}
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-1 right-1 p-0.5 text-gray-300 hover:text-white"
            aria-label="Close tooltip"
          >
            {/* Simple text 'X' or an SVG icon if available */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;
