import React from 'react';

function Terms() {
  return (
    <div className="animate-fade-in relative z-10 w-full pt-32 pb-32 bg-gray-50/50">
      
      {/* 1. Header Banner */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-black tracking-[0.25em] text-[#25D366] uppercase">Legal Agreement</span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mt-3 mb-4">Terms of Service</h1>
        <p className="text-gray-500 font-light text-sm md:text-base">
          Please read these terms carefully before using our services. Last updated: June 2026.
        </p>
      </div>

      {/* 2. Main Content Card */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm text-gray-700 leading-relaxed text-sm md:text-base space-y-8">
          
          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Agreement
            </h2>
            <p className="font-light text-gray-600">
              This Agreement is legally binding between <strong>Communication Technologies Pvt. Ltd</strong>, a company incorporated in Sri Lanka wholly owned by Business Communication Technologies Sdn. Bhd, (collectively "company", "our", "us", "we") and you or the entity that you represent (collectively "you" or "your"), who desires to access and use <strong>AgentBunny</strong> and other related services offered by the Company ("Services"). By accessing and using AgentBunny, you agree to comply with the terms, conditions, and notices outlined herein.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Account Setup
            </h2>
            <p className="font-light text-gray-600">
              To use this Service, you must register and provide a valid primary contact point. You agree to provide accurate, complete, and current information at all times. Failure to maintain accurate information may result in the suspension or termination of your Services.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Service Description
            </h2>
            <p className="font-light text-gray-600">
              The Service allows you to deploy <strong>AgentBunny</strong>, a conversational artificial intelligence agent, to perform automated tasks on your behalf. These tasks include managing incoming WhatsApp messages, cataloging products, answering customer queries, handling order checkouts, and updating delivery options. To enable AgentBunny to perform these tasks effectively, you will need to grant specific accesses.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Access & Information Provided
            </h2>
            <ul className="list-disc pl-5 space-y-2.5 font-light text-gray-600 mt-2">
              <li>
                <strong>WhatsApp Access:</strong> You agree to link your designated WhatsApp Business accounts to the platform to allow AgentBunny to handle customer messages and manage inquiries on your behalf.
              </li>
              <li>
                <strong>Customer Contact Details:</strong> For sending orders, confirmations, or broadcast alerts, you will provide the relevant customer contact information for AgentBunny to utilize.
              </li>
              <li>
                <strong>Business Info:</strong> To train AgentBunny to reply correctly, you will share public-facing information about your store, products, services, operating hours, FAQs, and policies.
              </li>
            </ul>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Confidentiality & Data Use
            </h2>
            <p className="font-light text-gray-600 mb-3">
              We maintain high standards of confidentiality for any sensitive information (such as customer contact details and transaction logs) you provide. This data will only be processed for your authorized tasks and is never shared with unauthorized third parties.
            </p>
            <p className="font-light text-gray-600">
              The public business information you share will be used to train and optimize AgentBunny's knowledge base related to your brand. This ensures relevant, localized, and accurate responses are delivered to your customers.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Payment & Refund Policy
            </h2>
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-5 text-red-900">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-2">No Refunds Policy</h3>
              <p className="font-light text-xs md:text-sm text-red-800 leading-relaxed">
                All payments made for AgentBunny subscription packages are final and non-refundable. By purchasing or subscribing to any of our plans, you acknowledge and agree that no refunds or partial credits will be issued for any reason, including dissatisfaction, early cancellation, or unused usage limits.
              </p>
            </div>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              AI System Disclosure
            </h2>
            <p className="font-light text-gray-600">
              You understand that AgentBunny is an artificial intelligence assistant system. While we strive to maintain the highest accuracy, AI systems may occasionally display conversational anomalies, generate errors, or interpret customer intents incorrectly. The Company endeavors to keep the models optimized but disclaims any warranty, express or implied, regarding the output or accuracy of responses generated by AgentBunny.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Limitation of Liability
            </h2>
            <p className="font-light text-xs text-gray-500 uppercase tracking-wide leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS INTERRUPTION, ARISING OUT OF THE USE OR INABILITY TO USE THE SERVICES. IN NO EVENT SHALL THE COMPANY'S TOTAL AGGREGATE LIABILITY EXCEED THE SUBSCRIPTION FEES PAID BY YOU IN THE PRECEDING TWO (2) MONTHS.
            </p>
          </section>

          <section className="pb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Governing Law
            </h2>
            <p className="font-light text-gray-600">
              This Agreement shall be governed by, and construed in compliance with, the laws and regulations of the Democratic Socialist Republic of Sri Lanka. Any disputes arising from this agreement shall be settled through negotiation or arbitration under the rules of Sri Lankan commercial development institutions.
            </p>
          </section>

        </div>
      </div>

    </div>
  );
}

export default Terms;
