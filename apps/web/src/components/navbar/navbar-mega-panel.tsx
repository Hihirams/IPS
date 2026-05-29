'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconCircle,
  IconChevronRight,
  IconDeviceLaptop,
  IconDeviceTv,
  IconCamera,
  IconLayoutDashboard,
  IconTrendingUp,
  IconStar,
  IconFlame,
  IconClock,
  IconEye,
  IconTruck,
  IconCheck,
  IconRefresh,
  IconFileInvoice,
  IconBell,
  IconUser,
  IconMapPin,
  IconLock,
  IconLogout,
  IconCreditCard,
} from '@tabler/icons-react';
import { PANELS, type PanelItem } from './navbar-data';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number | string }>> = {
  'ti-laptop': IconDeviceLaptop,
  'ti-device-tv': IconDeviceTv,
  'ti-camera': IconCamera,
  'ti-layout-dashboard': IconLayoutDashboard,
  'ti-trending-up': IconTrendingUp,
  'ti-star': IconStar,
  'ti-flame': IconFlame,
  'ti-clock': IconClock,
  'ti-eye': IconEye,
  'ti-truck': IconTruck,
  'ti-check': IconCheck,
  'ti-refresh': IconRefresh,
  'ti-file-invoice': IconFileInvoice,
  'ti-bell': IconBell,
  'ti-user': IconUser,
  'ti-map-pin': IconMapPin,
  'ti-lock': IconLock,
  'ti-logout': IconLogout,
  'ti-credit-card': IconCreditCard,
};

function DynamicIcon({ name, size = 17 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <IconCircle size={size} />;
  return <Icon size={size} />;
}

interface MegaPanelProps {
  panelKey: string | null;
  sideExpanded: boolean;
  top: number;
}

export function NavbarMegaPanel({ panelKey, sideExpanded, top }: MegaPanelProps) {
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());

  if (!panelKey || !PANELS[panelKey]) return null;

  const data = PANELS[panelKey];
  const leftOffset = sideExpanded ? 16 + 210 + 12 : 16 + 56 + 12;

  function toggleSub(colIdx: number, itemIdx: number) {
    const key = `${colIdx}-${itemIdx}`;
    setOpenSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.clear();
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div
      className="fixed z-30 flex min-w-[240px] max-h-[calc(100vh-98px)] overflow-hidden rounded-[22px] bg-white/82 backdrop-blur-[36px] border border-black/[0.09] shadow-[0_8px_40px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out"
      style={{
        left: leftOffset,
        top: Math.max(82, top),
      }}
    >
      {data.cols.map((col, colIdx) => (
        <div
          key={colIdx}
          className="flex min-w-[220px] shrink-0 flex-col overflow-y-auto border-r border-black/[0.07] py-2.5 last:border-r-0"
        >
          <div className="mb-1 shrink-0 border-b border-black/[0.06] px-4 pb-2.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.55px] text-black/26">
            {col.head}
          </div>
          {col.items.map((item: PanelItem, itemIdx: number) => {
            const subKey = `${colIdx}-${itemIdx}`;
            const isSubOpen = openSubs.has(subKey);

            const itemCls = "group flex min-h-[38px] w-full items-center gap-2.5 px-4 py-1.5 text-[13.5px] text-black/54 transition-colors hover:bg-black/4 hover:text-black/86";
            const itemContent = (
              <>
                <DynamicIcon name={item.icon} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.sub ? (
                  <IconChevronRight
                    size={11}
                    className={`shrink-0 text-black/20 transition-transform ${
                      isSubOpen ? 'rotate-90 text-black/38' : ''
                    }`}
                  />
                ) : item.tag ? (
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                      item.tagClass === 'hot'
                        ? 'bg-red-500/10 text-red-700/70'
                        : item.tagClass === 'new'
                        ? 'bg-green-500/10 text-green-700/70'
                        : 'bg-black/[0.06] text-black/36'
                    }`}
                  >
                    {item.tag}
                  </span>
                ) : null}
              </>
            );

            return (
              <div key={itemIdx}>
                {item.href && !item.sub ? (
                  <Link href={item.href} className={itemCls}>
                    {itemContent}
                  </Link>
                ) : (
                  <button
                    onClick={() => { if (item.sub) toggleSub(colIdx, itemIdx); }}
                    className={itemCls}
                  >
                    {itemContent}
                  </button>
                )}

                {item.sub && (
                  <div
                    className={`overflow-hidden border-l border-black/[0.07] ml-7 transition-all duration-[280ms] ease-out ${
                      isSubOpen ? 'max-h-[300px]' : 'max-h-0'
                    }`}
                  >
                    {item.sub.map((sub, subIdx) => (
                      sub.href ? (
                        <Link
                          key={subIdx}
                          href={sub.href}
                          className="flex h-[34px] items-center gap-2 px-3.5 text-[12.5px] text-black/42 transition-colors hover:bg-black/4 hover:text-black/78"
                        >
                          <DynamicIcon name={sub.icon} size={14} />
                          {sub.label}
                        </Link>
                      ) : (
                        <div
                          key={subIdx}
                          className="flex h-[34px] cursor-pointer items-center gap-2 px-3.5 text-[12.5px] text-black/42 transition-colors hover:bg-black/4 hover:text-black/78"
                        >
                          <DynamicIcon name={sub.icon} size={14} />
                          {sub.label}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
