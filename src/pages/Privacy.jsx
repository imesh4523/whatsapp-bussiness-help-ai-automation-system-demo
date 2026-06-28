import React from 'react';

function Privacy() {
  return (
    <div className="animate-fade-in relative z-10 w-full pt-32 pb-32 bg-gray-50/50">
      
      {/* 1. Header Banner */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-black tracking-[0.25em] text-[#25D366] uppercase">Data Protection</span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mt-3 mb-4">Privacy Policy</h1>
        <p className="text-gray-500 font-light text-sm md:text-base">
          We respect your privacy and protect your personal data. Last updated: June 2026.
        </p>
      </div>

      {/* 2. Main Content Card */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm text-gray-700 leading-relaxed text-sm md:text-base space-y-8">
          
          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Introduction
            </h2>
            <p className="font-light text-gray-600">
              This Privacy Policy statement is made by <strong>Business Communication Technologies Sdn. Bhd</strong> consisting of its Sri Lankan legal entity <strong>Communication Technologies Pvt. Ltd.</strong> (collectively, "company", "we", "us" or "our"). We make our services accessible from mobile applications, web applications, or any other media form ("portals") to provide automation solutions ("services"). We respect the privacy of each person ("you", "your") who visits our portals, and we commit to protecting any personal information shared with us in accordance with applicable laws.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Collection of Personal Information
            </h2>
            <p className="font-light text-gray-600 mb-3">
              We may require you to provide personal information to access our automated services or engage in configuration activities. The reasons why you are asked to provide it will be made clear to you at the point of collection.
            </p>
            <p className="font-light text-gray-600">
              This information may include details such as your name, contact phone number, billing email address, business name, and catalog items. This data is used solely to identify your business entity and sync your WhatsApp configuration correctly.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-5 space-y-2.5 font-light text-gray-600">
              <li>To provide and configure the AgentBunny automated chat integrations you request.</li>
              <li>To improve, personalize, and enhance your user experience on our portal dashboards.</li>
              <li>To communicate updates, service maintenance notifications, and provide customer support.</li>
              <li>To develop new products, conversational features, and analytics functionality.</li>
              <li>To process applications and subscriptions requested by your business.</li>
            </ul>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Information Sharing & Disclosure
            </h2>
            <p className="font-light text-gray-600">
              We do not sell, rent, or lease any personal information volunteered on the portals to third parties for marketing purposes. Any information provided will be protected from loss, misuse, unauthorized access, or disclosure. Submitting personal information through our portals is entirely voluntary. If you link your WhatsApp numbers, we will use that data to serve chats and finalize checkouts as requested.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Cookies & Tracking Technologies
            </h2>
            <p className="font-light text-gray-600 mb-3">
              We use cookies, tracking pixels, and related analytics tools (such as Mixpanel) to understand user behavior, dashboard logins, and features interaction. This analytics data connects to unique user events to help us optimize the platform usability.
            </p>
            <p className="font-light text-gray-600">
              You can adjust your web browser settings to block or notify you about cookies. Note that disabling necessary cookies may cause parts of the AgentBunny dashboard to function incorrectly.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Unsecured Information Warning
            </h2>
            <p className="font-light text-gray-600">
              Please note that any sensitive information (such as bank details, credit card numbers, or confidential business files) sent to us via standard email might not be secure. We urge you to only share sensitive configurations inside the encrypted forms in your dashboard rather than via external messages.
            </p>
          </section>

          <section className="border-b border-gray-100 pb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Data Retention & Minors
            </h2>
            <p className="font-light text-gray-600 mb-3">
              We retain personal data only as long as necessary to provide the services you subscribed to. Personal data will be deleted or anonymized when it is no longer required for business operations or legal compliance.
            </p>
            <p className="font-light text-gray-600">
              The services are not intended for minors. We do not knowingly collect information from children under 13 years of age.
            </p>
          </section>

          <section className="pb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#25D366] rounded-full"></span>
              Contact Information
            </h2>
            <p className="font-light text-gray-600 mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact our data team:
            </p>
            <div className="bg-gray-50 rounded-2xl p-6 font-light space-y-2">
              <p><strong>Email:</strong> <a href="mailto:hello@agentbunny.com" className="text-[#075E54] hover:underline">hello@agentbunny.com</a></p>
              <p><strong>Phone:</strong> <span className="text-gray-950 font-medium">+94 77 766 7109</span></p>
            </div>
          </section>

        </div>
      </div>

    </div>
  );
}

export default Privacy;
