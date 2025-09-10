export const runtime = 'nodejs';

import { Metadata } from 'next';
import { getLogoUrl } from '@/lib/services/logo-service';
import Image from 'next/image';
import { Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Check Your Email - Machine Business Calculator',
  description: 'Please check your email to access the calculator.',
  robots: 'noindex, nofollow',
};

export default async function CalculatorConfirmPage() {
  const logoUrl = await getLogoUrl();
  
  return (
    <div className="min-h-screen bg-white">
      {/* White Header with Logo */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-6">
          <div className="max-w-7xl mx-auto flex justify-center">
            {logoUrl ? (
              <div className="h-12 w-[180px] relative">
                <Image
                  src={logoUrl}
                  alt="Machines for Makers"
                  fill
                  priority
                  sizes="180px"
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: '#30A9DE' }}>
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">M</span>
                  </div>
                </div>
                <span className="text-gray-700 font-semibold">Machines for Makers</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Message */}
      <div className="px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Check Your Email!
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            We've sent you an email with a link to access the Machine Business Calculator.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-3">
              Next Steps:
            </h2>
            <ol className="text-left space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-gray-500">1.</span>
                <span>Check your inbox for an email from Machines for Makers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500">2.</span>
                <span>Click the confirmation link in the email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500">3.</span>
                <span>You'll get instant access to the calculator</span>
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Can't find the email? Check your spam folder or promotions tab.
            </p>
            
            <div className="pt-4">
              <Link 
                href="/calculator"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                ← Try a different email address
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}