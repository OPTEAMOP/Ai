import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pin, Trash2, MessageSquare, PinOff } from 'lucide-react';

interface SidebarContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorPoint: { x: number; y: number };
  isPinned: boolean;
  onPin: () => void;
  onDelete: () => void;
  onFeedback: () => void;
}

export const SidebarContextMenu: React.FC<SidebarContextMenuProps> = ({
  isOpen,
  onClose,
  anchorPoint,
  isPinned,
  onPin,
  onDelete,
  onFeedback,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          style={{ top: anchorPoint.y, left: anchorPoint.x }}
          className="fixed z-[100] w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 mt-1 overflow-hidden"
        >
          {/* Pin / Unpin Item */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors text-left"
          >
            {isPinned ? (
              <>
                <PinOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Unpin</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-indigo-500" />
                <span>Pin Chat</span>
              </>
            )}
          </button>

          {/* Feedback Item */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFeedback();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors text-left"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Feedback</span>
          </button>

          <div className="h-px bg-gray-50 my-1 mx-2" />

          {/* Delete Item (Destructive) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 cursor-pointer transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Chat</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
