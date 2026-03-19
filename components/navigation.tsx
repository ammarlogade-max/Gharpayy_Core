'use client';
import { useRouter, usePathname } from 'next/navigation';

const TABS = [
  { label: 'Heatmap',      href: '/' },
  { label: "Today's Log",  href: '/todays-log' },
  { label: 'Coverage',     href: '/coverage-summary' },
  { label: 'Geo-Fence',    href: '/geo-fence' },
  { label: 'Clock In/Out', href: '/clock' },
  { label: 'Notices',      href: '/notices' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 md:px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition border-b-2 ${
                  isActive
                    ? 'text-orange-500 border-orange-500'
                    : 'text-gray-500 border-transparent hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}