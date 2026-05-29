'use client';

import Link from 'next/link';
import {
  IconHome,
  IconGridDots,
  IconPackage,
  IconUserCircle,
  IconSettings,
  IconChevronRight,
  IconCamera,
  IconLock,
  IconBell,
  IconFlame,
  IconRouter,
  IconDeviceLaptop,
  IconBolt,
  IconDeviceTv,
  IconClockHour4,
} from '@tabler/icons-react';
import { SIDE_NAV_GROUPS, type SideNavItem } from './navbar-data';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  'ti-home': IconHome,
  'ti-grid-dots': IconGridDots,
  'ti-package': IconPackage,
  'ti-user-circle': IconUserCircle,
  'ti-settings': IconSettings,
  'ti-camera': IconCamera,
  'ti-lock': IconLock,
  'ti-bell': IconBell,
  'ti-flame': IconFlame,
  'ti-router': IconRouter,
  'ti-laptop': IconDeviceLaptop,
  'ti-bolt': IconBolt,
  'ti-device-tv': IconDeviceTv,
  'ti-clock': IconClockHour4,
};

function NavItemIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={size} />;
}

interface SidePillProps {
  expanded: boolean;
  activeSection: string | null;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onNavClick: (panelKey: string, id: string) => void;
}

export function NavbarSidePill({
  expanded,
  activeSection,
  onHoverEnter,
  onHoverLeave,
  onNavClick,
}: SidePillProps) {
  return (
    <div
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      className={`fixed top-[82px] left-4 bottom-4 z-40 flex flex-col items-start overflow-y-auto overflow-x-hidden rounded-[28px] bg-white/70 backdrop-blur-3xl border border-black/[0.09] shadow-[0_2px_20px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.05)] py-3.5 transition-all duration-300 ease-out ${
        expanded ? 'w-[210px] rounded-[22px]' : 'w-[56px]'
      }`}
    >
      {SIDE_NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? gi} className="w-full">
          {gi > 0 && (
            <div className="mx-3.5 my-1.5 h-px bg-black/[0.09]" />
          )}
          {expanded && group.label && (
            <div className="px-4 pt-1 pb-0.5 text-[9.5px] font-semibold uppercase tracking-[0.6px] text-black/24">
              {group.label}
            </div>
          )}
          {group.items.map((item: SideNavItem) => {
            const isActive = activeSection === item.id;
            const isPanelOpen = activeSection === item.panelKey;
            const content = (
              <>
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center text-black/36 transition-colors group-hover:text-black/75">
                  <NavItemIcon name={item.icon} />
                </div>
                <span
                  className={`flex-1 whitespace-nowrap text-[13.5px] font-normal tracking-tight text-black/44 transition-opacity delay-[60ms] ${
                    expanded ? 'opacity-100' : 'opacity-0'
                  } group-hover:text-black/80`}
                >
                  {item.label}
                </span>
                {item.panelKey && expanded && (
                  <IconChevronRight
                    size={11}
                    className={`shrink-0 text-black/18 transition-all ${
                      isPanelOpen ? 'rotate-90 text-black/38' : ''
                    } ${expanded ? 'opacity-100' : 'opacity-0'}`}
                  />
                )}
              </>
            );

            const baseClasses = `group flex min-h-[42px] w-full items-center gap-3 px-[15px] cursor-pointer transition-colors ${
              isActive || isPanelOpen ? 'bg-black/4 text-black/80' : 'hover:bg-black/4'
            }`;

            if (item.href) {
              return (
                <Link key={item.id} id={`nav-item-${item.id}`} href={item.href} className={baseClasses}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => item.panelKey && onNavClick(item.panelKey, item.id)}
                className={baseClasses}
              >
                {content}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex-1" />

      <Link
        href="/perfil"
        className="group flex min-h-[42px] w-full items-center gap-3 px-[15px] transition-colors hover:bg-black/4"
      >
        <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center text-black/36 transition-colors group-hover:text-black/75">
          <IconSettings size={18} />
        </div>
        <span
          className={`flex-1 whitespace-nowrap text-[13.5px] font-normal tracking-tight text-black/44 transition-opacity delay-[60ms] ${
            expanded ? 'opacity-100' : 'opacity-0'
          } group-hover:text-black/80`}
        >
          Ajustes
        </span>
      </Link>
    </div>
  );
}
