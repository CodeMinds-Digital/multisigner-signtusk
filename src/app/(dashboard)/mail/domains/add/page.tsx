'use client';

import { DomainSetupWizard } from '@/components/mail/domain-setup-wizard';

export default function AddDomainPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <DomainSetupWizard />
    </div>
  );
}
