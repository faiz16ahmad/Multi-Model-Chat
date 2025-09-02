'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Model } from '../lib/atoms';

interface ModelTooltipProps {
  model: Model;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function ModelTooltip({ model, children, disabled }: ModelTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 320; // Approximate tooltip width
    const tooltipHeight = 200; // Approximate tooltip height
    const padding = 16;
    
    let x = rect.right + 8;
    let y = rect.top + rect.height / 2;
    
    // Check if tooltip would go off the right edge of screen
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = rect.left - tooltipWidth - 8; // Position to the left instead
    }
    
    // Check if tooltip would go off the bottom of screen
    if (y + tooltipHeight / 2 > window.innerHeight - padding) {
      y = window.innerHeight - tooltipHeight / 2 - padding;
    }
    
    // Check if tooltip would go off the top of screen
    if (y - tooltipHeight / 2 < padding) {
      y = tooltipHeight / 2 + padding;
    }
    
    setPosition({ x, y });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const formatContextLength = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`;
    return length.toString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-800';
      case 'rate-limited': return 'text-orange-800';
      case 'unavailable': return 'text-red-800';
      default: return 'text-black';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'rate-limited':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'unavailable':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>

      {mounted && isVisible && createPortal(
        <div
          className="fixed pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translateY(-50%)',
            zIndex: 9999999
          }}
        >
          <div className="relative">
            {/* Arrow pointer */}
            <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
              <div className="w-0 h-0 border-t-6 border-b-6 border-r-6 border-transparent drop-shadow-sm" style={{ borderRightColor: '#ffffff' }}></div>
              <div className="absolute w-0 h-0 border-t-6 border-b-6 border-r-6 border-transparent -left-px" style={{ borderRightColor: '#000000' }}></div>
            </div>
            
            <div className="bg-white border-4 border-black rounded-xl p-5 max-w-sm text-black ml-2 relative" style={{ 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 0, 0, 1)',
              backgroundColor: '#ffffff',
              color: '#000000'
            }}>
              {/* Header with bright background */}
              <div className="flex items-start justify-between mb-4 bg-gray-50 p-3 rounded-lg border-2 border-black">
                <div>
                  <h3 className="font-black text-black text-base" style={{ color: '#000000' }}>{model.fullName}</h3>
                  <p className="text-sm text-black mt-1 font-bold" style={{ color: '#000000' }}>{model.provider}</p>
                </div>
                <div className={`flex items-center gap-2 ${getStatusColor(model.status)}`}>
                  {getStatusIcon(model.status)}
                  <span className="text-sm capitalize font-black text-black" style={{ color: '#000000' }}>{model.status}</span>
                </div>
              </div>

              {/* Description with background */}
              <div className="bg-gray-50 p-3 rounded-lg border-2 border-black mb-4">
                <p className="text-sm text-black leading-relaxed font-semibold" style={{ color: '#000000' }}>
                  {model.description}
                </p>
              </div>

              {/* Details with strong background */}
              <div className="space-y-3 mb-4 bg-gray-50 p-3 rounded-lg border-2 border-black">
                <div className="flex justify-between items-center bg-white p-2 rounded border border-black">
                  <span className="text-sm text-black font-bold" style={{ color: '#000000' }}>Context Length:</span>
                  <span className="text-sm text-black font-mono font-black bg-gray-200 px-2 py-1 rounded border border-black" style={{ color: '#000000' }}>
                    {formatContextLength(model.contextLength)} tokens
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white p-2 rounded border border-black">
                  <span className="text-sm text-black font-bold" style={{ color: '#000000' }}>Pricing:</span>
                  <span className={`text-sm font-black px-3 py-1 rounded-full border-2 border-black ${
                    model.pricing === 'free' ? 'bg-green-200 text-black' : 'bg-blue-200 text-black'
                  }`} style={{ color: '#000000' }}>
                    {model.pricing === 'free' ? 'FREE' : 'PAID'}
                  </span>
                </div>
              </div>

              {/* Strengths with bright background */}
              <div className="bg-gray-50 p-3 rounded-lg border-2 border-black">
                <p className="text-sm text-black mb-3 font-black" style={{ color: '#000000' }}>Strengths:</p>
                <div className="flex flex-wrap gap-2">
                  {model.strengths.map((strength, index) => (
                    <span
                      key={index}
                      className="inline-block px-3 py-2 bg-white text-black text-sm rounded-lg border-2 border-black font-bold"
                      style={{ color: '#000000' }}
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}