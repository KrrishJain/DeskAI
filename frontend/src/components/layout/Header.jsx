/**
 * components/layout/Header.jsx
 */

import { useState, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Link } from 'react-router-dom';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export default function Header({ mini, onToggleMini, onMobileMenu }) {
  const { user, logout } = useAuth();
  const { notifications } = useSocket() || {};
  const unread = notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 z-20 h-16 flex items-center justify-between px-4 lg:px-6',
        'bg-white/90 backdrop-blur border-b border-surface-200',
        'transition-[left] duration-[220ms]',
        mini ? 'left-[72px]' : 'left-[260px]',
        'left-0 lg:left-auto',
        mini ? 'lg:left-[72px]' : 'lg:left-[260px]'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button onClick={onMobileMenu} className="btn-ghost btn-icon lg:hidden">
          <Bars3Icon className="w-5 h-5" />
        </button>

        {/* Desktop mini toggle */}
        <button onClick={onToggleMini} className="hidden lg:flex btn-ghost btn-icon">
          {mini
            ? <ChevronDoubleRightIcon className="w-4 h-4 text-surface-500" />
            : <ChevronDoubleLeftIcon className="w-4 h-4 text-surface-500" />
          }
        </button>

        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl
                        bg-surface-100 text-surface-400 text-sm w-56 cursor-text">
          <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
          <span>Search...</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Menu as="div" className="relative">
          <Menu.Button className="btn-ghost btn-icon relative">
            <BellIcon className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </Menu.Button>
          <Transition as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl2
                                   bg-white shadow-modal border border-surface-100 focus:outline-none overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-100">
                <p className="text-sm font-semibold text-surface-900">Notifications</p>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {(!notifications || notifications.length === 0) ? (
                  <p className="px-4 py-6 text-sm text-surface-400 text-center">No new notifications</p>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <Menu.Item key={n.id}>
                      <div className="px-4 py-3 hover:bg-surface-50 cursor-pointer border-b border-surface-50">
                        <p className="text-sm font-medium text-surface-800">{n.title}</p>
                        <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    </Menu.Item>
                  ))
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* User menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl
                                   hover:bg-surface-100 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 font-semibold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-surface-800 leading-none">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-surface-400 mt-0.5 capitalize">{user?.role}</p>
            </div>
          </Menu.Button>
          <Transition as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl2
                                   bg-white shadow-modal border border-surface-100 focus:outline-none p-1">
              <Menu.Item>
                {({ active }) => (
                  <Link to="/profile" className={clsx('nav-item w-full text-sm', active && 'bg-surface-100')}>
                    My Profile
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link to="/settings" className={clsx('nav-item w-full text-sm', active && 'bg-surface-100')}>
                    Settings
                  </Link>
                )}
              </Menu.Item>
              <div className="my-1 h-px bg-surface-100" />
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={logout}
                    className={clsx('nav-item w-full text-sm text-red-500 hover:bg-red-50', active && 'bg-red-50')}
                  >
                    Sign Out
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </header>
  );
}