'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';

interface WorkspaceMenuProps {
  domainId: string;
  domainName: string;
  isArchived?: boolean;
  onRenameClick: () => void;
  onArchiveToggle: () => void;
  onDeleteClick: () => void;
  buttonClassName?: string;
  menuAlign?: 'left' | 'right';
}

export default function WorkspaceMenu({
  domainId,
  domainName,
  isArchived = false,
  onRenameClick,
  onArchiveToggle,
  onDeleteClick,
  buttonClassName,
  menuAlign = 'right',
}: WorkspaceMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={
          buttonClassName ||
          'p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-colors'
        }
        title="Workspace Options"
        aria-label="Workspace Options"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            menuAlign === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 w-48 rounded-2xl bg-[#141622] border border-zinc-800 shadow-2xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider truncate">
            {domainName}
          </div>

          <div className="space-y-0.5 mt-0.5">
            <button
              type="button"
              onClick={(e) => handleAction(e, onRenameClick)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
            >
              <Pencil className="w-3.5 h-3.5 text-zinc-400" />
              <span>Rename Workspace</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleAction(e, onArchiveToggle)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
            >
              {isArchived ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Restore Workspace</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Archive Workspace</span>
                </>
              )}
            </button>

            <div className="border-t border-zinc-800/80 my-1 pt-1">
              <button
                type="button"
                onClick={(e) => handleAction(e, onDeleteClick)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
