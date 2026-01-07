import React from 'react';
import './Skeleton.css';

export const PipelineSkeleton = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-icon" />
        <div className="skeleton-text-group">
          <div className="skeleton-title" />
          <div className="skeleton-subtitle" />
        </div>
      </div>
      <div className="skeleton-steps">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-step" />
        ))}
      </div>
    </div>
  );
};

export const RoutineSkeleton = () => {
  return (
    <div className="skeleton-routine">
      <div className="skeleton-circle" />
      <div className="skeleton-text-group">
        <div className="skeleton-time" />
        <div className="skeleton-routine-title" />
      </div>
    </div>
  );
};
