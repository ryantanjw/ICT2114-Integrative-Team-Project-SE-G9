import React, { useState, useEffect } from 'react';
import { MdArrowUpward } from 'react-icons/md';

export default function ScrollFab() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-44 right-5 2xl:right-40 p-3 rounded-full shadow-lg bg-black text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 z-50"
    >
      <MdArrowUpward size={24} />
    </button>
  );
}