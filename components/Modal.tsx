"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent scrolling and handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-[6px] flex items-center justify-center z-[100] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-alita-white w-full max-w-[600px] rounded-2xl shadow-elevated flex flex-col overflow-hidden animate-fade-in-scale mx-4 border border-alita-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with orange accent top border */}
        <div className="relative px-6 py-5 border-b border-alita-gray-100">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-alita-orange via-alita-orange-light to-alita-orange-dark rounded-t-2xl" />
          <div className="flex justify-between items-center">
            <h2 className="text-[1.1rem] font-black text-alita-black tracking-tight leading-tight">{title}</h2>
            <button 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-alita-gray-400 hover:bg-alita-gray-100 hover:text-alita-black transition-all duration-200" 
              onClick={onClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
