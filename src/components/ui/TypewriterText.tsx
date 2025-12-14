'use client';

import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  show: boolean;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function TypewriterText({
  text,
  show,
  speed = 100,
  className = '',
  style = {}
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!show) {
      setDisplayText('');
      setCurrentIndex(0);
      setShowCursor(true);
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      // After typing is complete, blink cursor a few times then hide
      const blinkTimer = setTimeout(() => {
        setShowCursor(false);
      }, 3000);
      return () => clearTimeout(blinkTimer);
    }
  }, [show, currentIndex, text, speed]);

  // Cursor blink animation
  useEffect(() => {
    if (show && showCursor) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [show, showCursor]);

  return (
    <span className={className} style={style}>
      {displayText}
      {show && (
        <span
          className={`inline-block w-0.5 h-6 ml-1 ${showCursor ? 'bg-current' : 'bg-transparent'}`}
          style={{ transition: 'background-color 0.1s' }}
        />
      )}
    </span>
  );
}
