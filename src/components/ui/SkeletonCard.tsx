import React from "react";

const SkeletonCard = () => {
  return (
    <div className="w-full h-64 bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      {/* Icon Area */}
      <div className="w-12 h-12 bg-gray-100 rounded-xl mb-4" />
      {/* Title Area */}
      <div className="h-6 w-3/4 bg-gray-100 rounded mb-2" />
      {/* Description Area */}
      <div className="h-4 w-1/2 bg-gray-100 rounded" />
    </div>
  );
};

export default SkeletonCard;
