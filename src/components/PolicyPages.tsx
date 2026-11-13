import React, { useEffect } from 'react';

const setSeoTags = (title: string, description: string, canonical: string) => {
  if (typeof document === 'undefined') return;

  document.title = title;

  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.setAttribute('name', 'description');
    document.head.appendChild(descTag);
  }
  descTag.setAttribute('content', description);

  let robotsTag = document.querySelector('meta[name="robots"]');
  if (!robotsTag) {
    robotsTag = document.createElement('meta');
    robotsTag.setAttribute('name', 'robots');
    document.head.appendChild(robotsTag);
  }
  robotsTag.setAttribute('content', 'index, follow');

  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonical);
};

interface PolicyPageProps {
  title: string;
  description: string;
  heading: string;
  content: string[];
}

const PolicyPageLayout: React.FC<PolicyPageProps> = ({ title, description, heading, content }) => {
  useEffect(() => {
    setSeoTags(title, description, `https://www.proprupee.com${window.location.pathname}`);
  }, []);

  return (
    <div className="min-h-screen bg-[#050812] text-white">
      <header className="border-b border-white/10 bg-[#050812]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <a href="/" className="text-sm font-black uppercase tracking-[0.24em] text-white">Proprupee</a>
          <nav className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            <a href="/what-is-proprupee" className="transition hover:text-emerald-200">What is Proprupee?</a>
            <a href="/faq" className="transition hover:text-emerald-200">FAQ</a>
            <a href="/terms-and-conditions" className="transition hover:text-emerald-200">Terms</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/8 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200">Legal Document</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">{heading}</h1>
        </div>

        <div className="space-y-6">
          {content.map((paragraph, index) => (
            <p key={index} className="text-base leading-8 text-slate-300">{paragraph}</p>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-[-0.04em] text-white">Related Pages</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              ['What is Proprupee?', '/what-is-proprupee'],
              ['How It Works', '/how-proprupee-works'],
              ['Trader Evaluation', '/trader-evaluation'],
              ['Funding Program', '/funding-program'],
              ['FAQ', '/faq'],
              ['Risk Disclaimer', '/risk-disclaimer'],
            ].map(([label, href]) => (
              <a key={href} href={href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white">
                {label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export const PrivacyPolicyPage: React.FC = () => (
  <PolicyPageLayout
    title="Privacy Policy | Proprupee"
    description="Proprupee's Privacy Policy explains how we collect, use, store, and protect your personal and financial information when you use our trader funding platform."
    heading="Privacy Policy"
    content={[
      'Proprupee ("we", "our", or "us") is committed to protecting the privacy of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website https://www.proprupee.com or use our trading platform services.',
      'We collect information that you provide directly to us, including your name, email address, phone number, and payment details when you register for an account, purchase a challenge, or contact support. We also collect usage data automatically, such as your IP address, browser type, operating system, referring URLs, access times, and pages viewed. This data helps us improve our platform and detect potential security issues.',
      'We use your information to provide, maintain, and improve our services; process transactions and send related information; send promotional communications (with your consent where required); detect and prevent fraud; comply with legal obligations; and communicate with you about updates or changes to our terms.',
      'We do not sell your personal information to third parties. We may share your data with service providers who assist in operating our platform, processing payments, or providing analytics. These third parties are contractually obligated to use your data only for the purposes we specify.',
      'We retain your personal information for as long as your account remains active or as needed to provide services. You may request deletion of your data by contacting support@proprupee.com. We implement appropriate technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, or destruction.',
      'If you are located in India, your personal data is processed in accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023. You have rights regarding access, correction, and deletion of your data. For questions about this policy, contact us at support@proprupee.com.',
    ]}
  />
);

export const RefundCancellationPage: React.FC = () => (
  <PolicyPageLayout
    title="Refund & Cancellation Policy | Proprupee"
    description="Proprupee's Refund & Cancellation Policy outlines the conditions under which challenge fees may be refunded and how to request a cancellation."
    heading="Refund & Cancellation Policy"
    content={[
      'At Proprupee, we want you to be satisfied with your experience. This policy explains our refund and cancellation terms for challenge purchases and platform services.',
      'Challenge fees are non-refundable once the evaluation has begun. If you have not started any trades in your challenge account, you may request a cancellation within 7 calendar days of purchase. Eligible refunds will be processed to the original payment method within 14 business days.',
      'If you believe you are eligible for a refund due to a technical issue on our platform that prevented you from completing the evaluation, please contact support@proprupee.com with your transaction ID and a detailed explanation. Our team will review your case within 3 business days.',
      'Cancellations must be requested through support@proprupee.com or via the refund request form linked in your dashboard. Please include your account email, challenge plan name, and reason for cancellation.',
      'Please note that prop trading involves market risk, and challenge fees cover administrative and platform costs regardless of evaluation outcome. Refunds are granted only under the specific conditions outlined above and are at the discretion of our support team.',
    ]}
  />
);

export const PrivacyPolicySeoPage: React.FC = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/privacy-policy';
  }
  return null;
};

export const RefundCancellationSeoPage: React.FC = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/refund-policy';
  }
  return null;
};
