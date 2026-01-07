"use client";
import { OfflineBanner } from '../OfflineBanner';
import { InstallBanner } from '../InstallBanner';
import { ConflictBanner } from '../ConflictBanner';

export function BannerStack() {
  return (
    <div className="w-full sticky top-0 z-30">
      <OfflineBanner />
      <InstallBanner />
      <ConflictBanner />
    </div>
  );
}
