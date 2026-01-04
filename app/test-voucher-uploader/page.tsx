'use client';

import { useState } from 'react';
import VoucherCardUploader, { VoucherItem } from '@/components/shared/VoucherCardUploader';

export default function TestVoucherUploaderPage() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-[#192c4d] mb-2">
            Test: VoucherCardUploader
          </h1>
          <p className="text-gray-600">
            Componente de carga multiple de vouchers con OCR automatico GPT-4 Vision
          </p>
        </div>

        <VoucherCardUploader
          localId="LOC-TEST-001"
          onVouchersChange={(newVouchers) => {
            console.log('Vouchers actualizados:', newVouchers);
            setVouchers(newVouchers);
          }}
          initialVouchers={[]}
          disabled={false}
          maxVouchers={10}
        />

        {/* Debug Info */}
        <div className="mt-8 bg-gray-800 text-white p-4 rounded-lg">
          <h3 className="font-mono text-sm mb-2">DEBUG: Estado Actual</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(vouchers, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
