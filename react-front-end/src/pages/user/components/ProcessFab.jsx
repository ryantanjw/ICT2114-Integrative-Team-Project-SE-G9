import React from 'react';
import { MdAdd } from 'react-icons/md';

export default function ProcessFab({ onAddProcess }) {
  const scrollToBottom = () => {
    const anchor = document.getElementById('form1-bottom');
    if (anchor && typeof anchor.scrollIntoView === 'function') {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
    }
  };

  const handleClick = () => {
    // 1) Add the new process
    if (typeof onAddProcess === 'function') {
      onAddProcess();
    }

    // 2) Scroll AFTER the DOM grows. Do a double-tick to be safe.
    //    This covers React state update + layout.
    requestAnimationFrame(() => {
      scrollToBottom();
      setTimeout(scrollToBottom, 120);
    });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Add process and scroll to bottom"
      className="fixed bottom-30 right-5 2xl:right-40 p-3 rounded-full shadow-lg bg-black text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 z-50"
      title="Add Process"
    >
      <MdAdd size={24} />
    </button>
  );
}