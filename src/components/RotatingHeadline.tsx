import { useState, useEffect, useCallback } from "react";

const headlines = [
  "Run the business.\nNot the paperwork.",
  "Know what's happening\nin your business every day.",
  "Turn daily activity\ninto clear decisions.",
  "Build structure before\nyour business outgrows you.",
  "Operate like a serious business,\neven if you're just starting."
];

interface RotatingHeadlineProps {
  onComplete?: () => void;
  speed?: number;
}

const RotatingHeadline = ({ onComplete, speed = 45 }: RotatingHeadlineProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isErasing, setIsErasing] = useState(false);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  const currentHeadline = headlines[currentIndex];

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || isErasing) return;

    if (charIndex < currentHeadline.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + currentHeadline[charIndex]);
        setCharIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      // Finished typing current headline
      if (!hasCalledComplete && onComplete) {
        onComplete();
        setHasCalledComplete(true);
      }
      setIsTyping(false);
    }
  }, [charIndex, currentHeadline, speed, isTyping, isErasing, onComplete, hasCalledComplete]);

  // Start erasing after pause
  useEffect(() => {
    if (isTyping || isErasing) return;

    const timeout = setTimeout(() => {
      setIsErasing(true);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [isTyping, isErasing]);

  // Erasing effect
  useEffect(() => {
    if (!isErasing) return;

    if (displayedText.length > 0) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev.slice(0, -1));
      }, speed * 0.5); // Erase faster than typing
      return () => clearTimeout(timeout);
    } else {
      // Finished erasing, move to next headline
      setIsErasing(false);
      setCurrentIndex((prev) => (prev + 1) % headlines.length);
      setCharIndex(0);
      setIsTyping(true);
    }
  }, [displayedText, isErasing, speed]);

  // Process text to handle line breaks
  const processedText = displayedText.split('\n').map((line, index, arr) => (
    <span key={index}>
      {line}
      {index < arr.length - 1 && <br />}
    </span>
  ));

  return (
    <span>
      {processedText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

export default RotatingHeadline;
