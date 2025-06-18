import React from 'react';

export default function StatusCard({ title, symbol, color }) {
  return (
    <div className={`flex items-center p-4 rounded-lg shadow ${color}`}>
      <div className="text-2xl mr-3">
        {symbol}
      </div>
      <div className="text-lg font-medium">
        {title}
      </div>
    </div>
  );
}