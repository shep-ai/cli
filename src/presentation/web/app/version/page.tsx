import { getVersionInfo, getSystemInfo } from '@/lib/version';
import VersionPageClient from '@/components/features/version/version-page-client';

export default function VersionPage() {
  const versionInfo = getVersionInfo();
  const systemInfo = getSystemInfo();

  return <VersionPageClient versionInfo={versionInfo} systemInfo={systemInfo} />;
}
