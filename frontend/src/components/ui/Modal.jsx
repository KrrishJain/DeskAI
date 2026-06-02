/**
 * components/ui/Modal.jsx
 * Accessible modal dialog using @headlessui/react.
 */

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title: string,
 *   children: React.ReactNode,
 *   size?: 'sm' | 'md' | 'lg' | 'xl',
 *   footer?: React.ReactNode,
 * }} props
 */
export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const sizeMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  'w-full rounded-xl2 bg-white shadow-modal',
                  'ring-1 ring-surface-100',
                  sizeMap[size]
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                  <Dialog.Title className="font-display font-semibold text-surface-900 text-base">
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-surface-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5">{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-end gap-3 bg-surface-50/50 rounded-b-xl2">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}