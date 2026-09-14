import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronUp, ArrowRight, Menu, X } from 'lucide-react';
import { APP_NAME } from './BrandLogo';

interface TOCItem {
  id: string;
  title: string;
}

const tableOfContents: TOCItem[] = [
  { id: 'introduction', title: '1. Introduction' },
  { id: 'about-proprupee', title: '2. About Proprupee' },
  { id: 'eligibility', title: '3. Eligibility' },
  { id: 'account-registration', title: '4. Account Registration & Security' },
  { id: 'evaluation-programs', title: '5. Evaluation Programs' },
  { id: 'no-guarantee', title: '6. No Guarantee of Funding' },
  { id: 'trading-environment', title: '7. Trading Environment' },
  { id: 'prohibited-conduct', title: '8. Prohibited Conduct' },
  { id: 'risk-management', title: '9. Risk Management & Rule Violations' },
  { id: 'fees-payments', title: '10. Fees & Payments' },
  { id: 'refunds', title: '11. Refunds & Cancellations' },
  { id: 'payouts', title: '12. Payouts' },
  { id: 'kyc-verification', title: '13. KYC & Verification' },
  { id: 'technical-issues', title: '14. Technical Issues & Market Data' },
  { id: 'no-investment-advice', title: '15. No Investment Advice' },
  { id: 'no-guarantee-profit', title: '16. No Guarantee of Profit' },
  { id: 'intellectual-property', title: '17. Intellectual Property' },
  { id: 'third-party-services', title: '18. Third-Party Services' },
  { id: 'suspension-termination', title: '19. Suspension & Termination' },
  { id: 'limitation-liability', title: '20. Limitation of Liability' },
  { id: 'indemnification', title: '21. Indemnification' },
  { id: 'changes-terms', title: '22. Changes to Terms' },
  { id: 'privacy', title: '23. Privacy' },
  { id: 'governing-law', title: '24. Governing Law & Dispute Resolution' },
  { id: 'severability', title: '25. Severability' },
  { id: 'entire-agreement', title: '26. Entire Agreement' },
  { id: 'contact', title: '27. Contact' },
];

const TermsAndConditions: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const [showTOC, setShowTOC] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Set document title and meta tags for SEO
  useEffect(() => {
    document.title = 'Terms & Conditions | Proprupee';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Read Proprupee\'s Terms & Conditions. Learn about evaluation programs, trading rules, fees, payouts, and legal information.');
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://proprupee.com/terms');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowTOC(false);
  };

  const renderSectionLink = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {text}
    </a>
  );

  return (
    <div className="min-h-screen bg-[#050812]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-[#050812]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-white hover:text-primary transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-primary via-lime-400 to-cyan-400 rounded-lg flex items-center justify-center">
              <span className="font-black text-slate-950 text-xs">P</span>
            </div>
            <span className="font-black text-sm">{APP_NAME}</span>
          </button>
          <h1 className="text-lg font-bold text-white">Terms & Conditions</h1>
          <div className="w-8" />
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">Terms & Conditions</h1>
            <p className="text-slate-400 text-sm">Last Updated: September 2026</p>
            <p className="text-slate-400 mt-4">
              These Terms & Conditions ("Terms") govern your access to and use of Proprupee's website, platform, evaluation programs, trading-related services, funding opportunities, educational materials, and related services.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Mobile TOC Toggle */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-white/10 bg-white/[0.045] text-white font-bold hover:bg-white/[0.075] transition-colors"
              >
                <span>Table of Contents</span>
                {showTOC ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {/* Table of Contents - Sidebar */}
            <aside
              className={`lg:col-span-1 ${
                showTOC ? 'block' : 'hidden'
              } lg:block lg:sticky lg:top-24 lg:h-fit`}
            >
              <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                  On This Page
                </h3>
                <nav className="space-y-2">
                  {tableOfContents.map(item => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition-all ${
                        activeSection === item.id
                          ? 'bg-primary/20 text-primary font-bold border-l-2 border-primary'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <main className="lg:col-span-3 space-y-8">
              {/* 1. Introduction */}
              <Section
                id="introduction"
                title="1. Introduction"
                active={activeSection === 'introduction'}
              >
                <p>
                  These Terms & Conditions apply to all access to and use of Proprupee's website, platform, user accounts, evaluation programs, trading simulations (where applicable), educational content, funding programs, and any related services offered by Proprupee ("Services").
                </p>
                <p>
                  By accessing, browsing, or using any part of Proprupee's Services, you agree to be bound by these Terms. If you do not agree, do not access or use Proprupee.
                </p>
              </Section>

              {/* 2. About Proprupee */}
              <Section
                id="about-proprupee"
                title="2. About Proprupee"
                active={activeSection === 'about-proprupee'}
              >
                <p>
                  Proprupee is a platform that evaluates traders based on their trading knowledge, experience, skills, strategy, and compliance with applicable program rules. Proprupee identifies and assesses trader capabilities and may consider eligible participants for opportunities under Proprupee's trading evaluation and potential funding programs.
                </p>
                <p>
                  Proprupee's primary function is trader evaluation and assessment. Passing an evaluation demonstrates adherence to trading rules and performance within program parameters. Evaluation does not automatically guarantee funding, profit sharing, or any financial guarantee.
                </p>
              </Section>

              {/* 3. Eligibility */}
              <Section
                id="eligibility"
                title="3. Eligibility"
                active={activeSection === 'eligibility'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">General Eligibility Requirements</h4>
                <p>
                  To register and use Proprupee's Services, you must:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Be at least 18 years of age (or the legal age of majority in your jurisdiction)</li>
                  <li>Provide accurate, complete, and truthful information during registration</li>
                  <li>Provide valid government-issued identification for verification</li>
                  <li>Comply with all applicable laws, regulations, and these Terms</li>
                  <li>Not be restricted, suspended, or terminated from any similar services</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Verification and Compliance</h4>
                <p>
                  Proprupee may conduct background checks, identity verification, and KYC/AML (Know Your Customer / Anti-Money Laundering) verification. You agree to provide all requested information promptly and accurately. Failure to complete verification may result in account suspension or termination.
                </p>
              </Section>

              {/* 4. Account Registration & Security */}
              <Section
                id="account-registration"
                title="4. Account Registration & Security"
                active={activeSection === 'account-registration'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">Account Responsibility</h4>
                <p>
                  You are responsible for maintaining the confidentiality and security of your account credentials, including username and password. You agree not to disclose your credentials to anyone else and to notify Proprupee immediately of any unauthorized access or suspicious activity.
                </p>

                <h4 className="font-bold text-white mt-4 mb-2">Account Sharing Prohibited</h4>
                <p>
                  Accounts are personal and non-transferable. You may not:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Share your account with others</li>
                  <li>Allow others to use your account</li>
                  <li>Transfer or assign your account to another person</li>
                  <li>Impersonate another user or provide false identity information</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">False Information and Impersonation</h4>
                <p>
                  Providing false, misleading, or incomplete information during registration or at any time is prohibited. Attempting to impersonate another person, create multiple accounts to circumvent limitations, or access the platform under false pretenses may result in immediate termination and legal action.
                </p>
              </Section>

              {/* 5. Evaluation Programs */}
              <Section
                id="evaluation-programs"
                title="5. Evaluation Programs"
                active={activeSection === 'evaluation-programs'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">Program-Specific Rules</h4>
                <p>
                  Each evaluation program offered by Proprupee may have its own specific rules, parameters, and conditions. When you select or purchase access to a program, you will be presented with the applicable program details, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Evaluation fees (if applicable)</li>
                  <li>Account or capital allocation amount</li>
                  <li>Profit targets</li>
                  <li>Maximum daily or total loss limits</li>
                  <li>Minimum trading requirements</li>
                  <li>Prohibited trading strategies or instruments</li>
                  <li>Trading period duration</li>
                  <li>Payout conditions and requirements</li>
                  <li>Specific eligibility criteria</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Program Rules Apply</h4>
                <p>
                  The program rules displayed to you at the time of registration or purchase are the rules that apply to your participation. By accepting or paying for a program, you explicitly agree to comply with all applicable program rules. Failure to comply with program rules may result in evaluation cancellation, account termination, and forfeiture of any potential payouts or proceeds.
                </p>
              </Section>

              {/* 6. No Guarantee of Funding */}
              <Section
                id="no-guarantee"
                title="6. No Guarantee of Funding"
                active={activeSection === 'no-guarantee'}
              >
                <p>
                  Passing an evaluation, completing trading tasks, or passing an interview does NOT automatically guarantee funding, capital allocation, profit sharing, or any financial opportunity. Proprupee is not obligated to provide funding or any financial benefit simply because you have participated in an evaluation.
                </p>
                <p>
                  After evaluation, Proprupee may conduct additional background verification, compliance review, risk assessment, and due diligence. Proprupee reserves the right to decline funding or participation for any reason, including but not limited to compliance concerns, risk factors, or changes in program availability.
                </p>
                <p>
                  Proprupee's evaluation programs are designed to assess trader capability and risk management. Evaluation results are informational and do not constitute a guarantee, offer, or commitment of any financial benefit.
                </p>
              </Section>

              {/* 7. Trading Environment */}
              <Section
                id="trading-environment"
                title="7. Trading Environment"
                active={activeSection === 'trading-environment'}
              >
                <p>
                  Where applicable, Proprupee may provide a simulated or technology-based trading environment for evaluation purposes. Such environments may simulate trading conditions, market data, and order execution but may differ from live market conditions.
                </p>
                <p>
                  Simulated trading performance does not guarantee performance in real markets. Market data, execution speeds, and other factors may differ significantly between simulated and real trading environments. Any past performance shown is for evaluation purposes only and is not indicative of future results.
                </p>
                <p>
                  Proprupee does not guarantee uninterrupted, accurate, or error-free simulated or real trading environments. Technical issues, server downtime, data delays, or market closures may affect trading capabilities.
                </p>
              </Section>

              {/* 8. Prohibited Conduct */}
              <Section
                id="prohibited-conduct"
                title="8. Prohibited Conduct"
                active={activeSection === 'prohibited-conduct'}
              >
                <p>
                  You agree not to engage in the following conduct:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li><strong>Account Sharing:</strong> Sharing, transferring, or allowing others to use your account</li>
                  <li><strong>False Information:</strong> Providing inaccurate, misleading, or false information</li>
                  <li><strong>Impersonation:</strong> Impersonating another user or providing false identity</li>
                  <li><strong>System Manipulation:</strong> Attempting to manipulate, hack, or interfere with Proprupee's systems, platform, or servers</li>
                  <li><strong>Exploitation of Errors:</strong> Exploiting technical glitches, bugs, or unintended system behavior for advantage</li>
                  <li><strong>Unauthorized Automation:</strong> Using bots, scripts, or unauthorized automation to access the platform or place trades</li>
                  <li><strong>Bypassing Controls:</strong> Attempting to bypass risk management controls, position limits, or trading restrictions</li>
                  <li><strong>Fraudulent Activity:</strong> Engaging in fraud, misrepresentation, or deceptive practices</li>
                  <li><strong>Collusion:</strong> Colluding with other users to manipulate results, share accounts, or circumvent program rules</li>
                  <li><strong>Market Manipulation:</strong> Engaging in activities intended to artificially move prices or manipulate trading results</li>
                  <li><strong>Abusive Use:</strong> Using the platform in any abusive, harassing, or unlawful manner</li>
                </ul>
              </Section>

              {/* 9. Risk Management & Rule Violations */}
              <Section
                id="risk-management"
                title="9. Risk Management & Rule Violations"
                active={activeSection === 'risk-management'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">Monitoring and Review</h4>
                <p>
                  Proprupee monitors trading activity and evaluates compliance with program rules. Proprupee may review your trades, account activity, and trading patterns at any time.
                </p>

                <h4 className="font-bold text-white mt-4 mb-2">Actions for Rule Violations</h4>
                <p>
                  If Proprupee determines that you have violated any program rules, these Terms, or applicable laws, Proprupee may take one or more of the following actions:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Issue a warning or formal notice</li>
                  <li>Restrict or limit your trading activity</li>
                  <li>Restrict trading in specific instruments or strategies</li>
                  <li>Cancel your evaluation or trial period</li>
                  <li>Terminate your account immediately</li>
                  <li>Cancel your funding eligibility</li>
                  <li>Forfeit any potential payouts or profits</li>
                  <li>Take other action permitted under applicable law or agreements</li>
                </ul>

                <p className="mt-4">
                  Proprupee's determination regarding rule violations is final. You may not appeal or dispute Proprupee's enforcement decisions.
                </p>
              </Section>

              {/* 10. Fees & Payments */}
              <Section
                id="fees-payments"
                title="10. Fees & Payments"
                active={activeSection === 'fees-payments'}
              >
                <p>
                  Some Proprupee programs may require evaluation fees or payments. All fees are displayed before you complete payment. By confirming and paying, you agree to the fee amount and acknowledge that payment does NOT automatically guarantee funding, approval, or any financial benefit.
                </p>
                <p>
                  Payment does NOT mean your application has been approved. After payment, Proprupee may still conduct verification, compliance review, and risk assessment. Proprupee reserves the right to decline your participation after payment.
                </p>
                <p>
                  All fees are collected by Proprupee through payment processors. Proprupee is not responsible for issues related to your payment method, bank, or payment processor. Ensure you have authorized the payment and that your payment information is correct.
                </p>
              </Section>

              {/* 11. Refunds & Cancellations */}
              <Section
                id="refunds"
                title="11. Refunds & Cancellations"
                active={activeSection === 'refunds'}
              >
                <p>
                  Refund and cancellation policies are detailed in the separate Proprupee Refund & Cancellation Policy, available at {renderSectionLink('/refund-policy', 'https://proprupee.com/refund-policy')}.
                </p>
                <p>
                  Please review the Refund & Cancellation Policy carefully. Refund eligibility, timelines, and conditions are determined according to that policy. This Terms document does not override or replace the Refund & Cancellation Policy.
                </p>
              </Section>

              {/* 12. Payouts */}
              <Section
                id="payouts"
                title="12. Payouts"
                active={activeSection === 'payouts'}
              >
                <p>
                  Where applicable, payouts are subject to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Successful completion of program evaluation criteria</li>
                  <li>Compliance with all applicable program rules</li>
                  <li>Successful identity and KYC verification</li>
                  <li>Satisfactory compliance and risk assessment</li>
                  <li>Fulfillment of all payout conditions specified in the program</li>
                  <li>Applicable laws and tax regulations</li>
                  <li>Proprupee's internal approval processes</li>
                </ul>

                <p className="mt-4">
                  Proprupee does NOT guarantee any payouts, profit distributions, or financial benefits. Even if you complete an evaluation or pass specific milestones, Proprupee reserves the right to withhold, delay, or cancel payouts for compliance, risk, or operational reasons.
                </p>

                <p>
                  Payout timelines are estimates only and are not guaranteed. Payouts may be delayed due to verification processes, compliance review, or third-party payment provider delays.
                </p>
              </Section>

              {/* 13. KYC & Verification */}
              <Section
                id="kyc-verification"
                title="13. KYC & Verification"
                active={activeSection === 'kyc-verification'}
              >
                <p>
                  Proprupee may require identity verification, Know Your Customer (KYC) verification, and collection of additional personal, financial, or tax information before allowing you to access certain Services, funding opportunities, or process payouts.
                </p>
                <p>
                  You agree to provide accurate, complete, and verifiable information as requested. You authorize Proprupee to verify your identity and information through third-party verification providers, background check services, and other means.
                </p>
                <p>
                  Failure to complete verification, providing false information, or failing verification may result in account restriction, suspension, or termination. Proprupee is not responsible for delays in verification or issues caused by inaccurate information you provide.
                </p>
                <p>
                  You are responsible for tax compliance. Proprupee may require tax identification information and file appropriate tax documents if applicable.
                </p>
              </Section>

              {/* 14. Technical Issues & Market Data */}
              <Section
                id="technical-issues"
                title="14. Technical Issues & Market Data"
                active={activeSection === 'technical-issues'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">Third-Party Dependencies</h4>
                <p>
                  Proprupee relies on third-party providers for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Market data and pricing information</li>
                  <li>Trading infrastructure and execution</li>
                  <li>Brokers and exchanges</li>
                  <li>Payment processing</li>
                  <li>Hosting and server infrastructure</li>
                  <li>Verification and KYC services</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">No Guarantee of Uninterrupted Service</h4>
                <p>
                  Proprupee does not guarantee uninterrupted, error-free, or secure service. The platform may experience:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Temporary downtime or maintenance</li>
                  <li>Technical errors or bugs</li>
                  <li>Data delays or inaccuracies</li>
                  <li>Market data delays from data providers</li>
                  <li>Trading execution delays</li>
                  <li>Network or connectivity issues</li>
                </ul>

                <p className="mt-4">
                  Proprupee is not liable for losses, missed trades, or other damages caused by technical issues, service interruptions, or third-party provider failures.
                </p>
              </Section>

              {/* 15. No Investment Advice */}
              <Section
                id="no-investment-advice"
                title="15. No Investment Advice"
                active={activeSection === 'no-investment-advice'}
              >
                <p>
                  Any educational materials, market analysis, charts, trading ideas, or information provided by Proprupee are for informational and educational purposes only. This information does NOT constitute:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Personalized investment advice</li>
                  <li>Portfolio management</li>
                  <li>A recommendation to buy, sell, or hold any security</li>
                  <li>Financial advice or guidance</li>
                  <li>An offer or solicitation for any financial product</li>
                </ul>

                <p className="mt-4">
                  Trading and investing involve significant risk of loss. You are solely responsible for your trading and investment decisions. Consult with a qualified financial advisor before making any investment decisions.
                </p>

                <p>
                  Past performance, including information shown in any simulated or real trading examples, does not guarantee future results. Trading outcomes depend on numerous factors including market conditions, strategy, execution, and timing.
                </p>
              </Section>

              {/* 16. No Guarantee of Profit */}
              <Section
                id="no-guarantee-profit"
                title="16. No Guarantee of Profit"
                active={activeSection === 'no-guarantee-profit'}
              >
                <p>
                  Trading and financial markets involve substantial risk of loss. Proprupee does NOT guarantee:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Profit or positive returns</li>
                  <li>Successful evaluation or program completion</li>
                  <li>Funding or capital allocation</li>
                  <li>A particular payout amount or percentage</li>
                  <li>Any financial benefit or result</li>
                </ul>

                <p className="mt-4">
                  You may lose your entire capital or evaluation fee. Trading performance is highly variable and depends on market conditions, strategy, execution, and numerous other factors beyond Proprupee's control.
                </p>

                <p>
                  You are solely responsible for understanding the risks associated with trading and for making your own trading decisions.
                </p>
              </Section>

              {/* 17. Intellectual Property */}
              <Section
                id="intellectual-property"
                title="17. Intellectual Property"
                active={activeSection === 'intellectual-property'}
              >
                <p>
                  All content, materials, software, technology, designs, graphics, videos, educational content, logos, and branding associated with Proprupee are the exclusive property of Proprupee or its licensors and are protected by copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  You may not:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Copy, reproduce, or distribute Proprupee's content or materials</li>
                  <li>Use Proprupee's logos, branding, or trademarks without permission</li>
                  <li>Modify, reverse-engineer, or attempt to derive proprietary technology</li>
                  <li>Publicly display Proprupee's materials or trading results</li>
                  <li>Create derivative works based on Proprupee's platform or content</li>
                </ul>

                <p className="mt-4">
                  Limited personal use of educational materials for your own learning is permitted. Commercial use, redistribution, or public display is prohibited without explicit written consent.
                </p>
              </Section>

              {/* 18. Third-Party Services */}
              <Section
                id="third-party-services"
                title="18. Third-Party Services"
                active={activeSection === 'third-party-services'}
              >
                <p>
                  Proprupee's Services may include integrations with, links to, or dependencies on third-party services, providers, platforms, or content, including brokers, exchanges, payment processors, and data providers.
                </p>
                <p>
                  Each third-party service is governed by its own terms of service and privacy policy. Proprupee is not responsible for third-party services, their performance, availability, or compliance. You agree to comply with all applicable third-party terms and conditions.
                </p>
                <p>
                  Proprupee is not liable for any issues, losses, or problems arising from third-party services, including trading errors, payment failures, or data inaccuracies.
                </p>
              </Section>

              {/* 19. Suspension & Termination */}
              <Section
                id="suspension-termination"
                title="19. Suspension & Termination"
                active={activeSection === 'suspension-termination'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">Grounds for Suspension or Termination</h4>
                <p>
                  Proprupee may suspend or terminate your account or access to Services at any time, for any reason, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Violation of these Terms or applicable program rules</li>
                  <li>Suspected fraudulent activity or misuse</li>
                  <li>Failure to complete or pass verification</li>
                  <li>Non-compliance with applicable laws</li>
                  <li>Risk or compliance concerns</li>
                  <li>Inactivity or abandonment of account</li>
                  <li>Any other reason at Proprupee's sole discretion</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Effect of Termination</h4>
                <p>
                  Upon termination or suspension:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Your access to the platform terminates immediately</li>
                  <li>Your account and all trading activity cease</li>
                  <li>Any pending payouts may be forfeited</li>
                  <li>Proprupee may delete account data per its data retention policies</li>
                </ul>

                <p className="mt-4">
                  Termination may be with or without notice. Proprupee is not obligated to provide explanation or opportunity to appeal.
                </p>
              </Section>

              {/* 20. Limitation of Liability */}
              <Section
                id="limitation-liability"
                title="20. Limitation of Liability"
                active={activeSection === 'limitation-liability'}
              >
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROPRUPEE, ITS OFFICERS, EMPLOYEES, AGENTS, AND PARTNERS ARE NOT LIABLE FOR:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Any indirect, incidental, special, or consequential damages</li>
                  <li>Loss of profits, revenue, or business opportunity</li>
                  <li>Loss of data, information, or trading results</li>
                  <li>Trading losses or financial damages</li>
                  <li>Errors, bugs, or technical issues</li>
                  <li>Third-party actions or services</li>
                  <li>Market conditions or price movements</li>
                  <li>Any other damages, even if advised of the possibility</li>
                </ul>

                <p className="mt-4">
                  Nothing in these Terms is intended to exclude or limit liability where such exclusion or limitation is prohibited by applicable law.
                </p>

                <p>
                  Your use of Proprupee's Services is at your own risk. The Services are provided "as is" without warranties of any kind.
                </p>
              </Section>

              {/* 21. Indemnification */}
              <Section
                id="indemnification"
                title="21. Indemnification"
                active={activeSection === 'indemnification'}
              >
                <p>
                  You agree to indemnify, defend, and hold harmless Proprupee and its officers, employees, and partners from any claims, damages, liabilities, costs, and expenses (including legal fees) arising from:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Your misuse of the platform or Services</li>
                  <li>Violation of these Terms</li>
                  <li>Violation of any laws or regulations</li>
                  <li>Your trading activity or financial decisions</li>
                  <li>Your use of third-party services through Proprupee</li>
                  <li>Fraud, illegal activity, or misconduct by you</li>
                  <li>Infringement of intellectual property rights</li>
                  <li>Any other damage caused by your actions</li>
                </ul>

                <p className="mt-4">
                  This indemnification survives termination of your account and these Terms.
                </p>
              </Section>

              {/* 22. Changes to Terms */}
              <Section
                id="changes-terms"
                title="22. Changes to Terms"
                active={activeSection === 'changes-terms'}
              >
                <p>
                  Proprupee reserves the right to modify, update, or change these Terms at any time. Updated Terms will be posted on this page, and the "Last Updated" date will be revised accordingly.
                </p>
                <p>
                  Continued use of Proprupee's Services after changes are posted constitutes your acceptance of the updated Terms. It is your responsibility to review these Terms periodically for updates.
                </p>
                <p>
                  Material changes may trigger additional notification. Significant changes to fees, program terms, or payout conditions will be communicated to affected users.
                </p>
              </Section>

              {/* 23. Privacy */}
              <Section
                id="privacy"
                title="23. Privacy"
                active={activeSection === 'privacy'}
              >
                <p>
                  Your use of Proprupee's Services is also governed by Proprupee's Privacy Policy, available at {renderSectionLink('/privacy-policy', 'https://proprupee.com/privacy-policy')}.
                </p>
                <p>
                  The Privacy Policy explains how Proprupee collects, uses, stores, and protects your personal and financial information. Please review the Privacy Policy carefully to understand Proprupee's data practices and your privacy rights.
                </p>
                <p>
                  In the event of any conflict between these Terms and the Privacy Policy, the Privacy Policy governs the handling of your personal information.
                </p>
              </Section>

              {/* 24. Governing Law & Dispute Resolution */}
              <Section
                id="governing-law"
                title="24. Governing Law & Dispute Resolution"
                active={activeSection === 'governing-law'}
              >
                <p className="text-slate-300 italic">
                  [To be finalized based on Proprupee's legal entity and applicable jurisdiction. Proprupee's legal team should confirm the governing law, applicable jurisdiction, and dispute resolution mechanism.]
                </p>
                <p className="text-xs text-slate-500 mt-4">
                  TODO: Insert governing law and dispute resolution provisions. Typical provisions include arbitration clauses, choice of law, and jurisdiction selection.
                </p>
              </Section>

              {/* 25. Severability */}
              <Section
                id="severability"
                title="25. Severability"
                active={activeSection === 'severability'}
              >
                <p>
                  If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision will be severed, and the remaining provisions will continue in full force and effect. The invalid provision will be modified to the minimum extent necessary to make it enforceable while preserving the original intent.
                </p>
              </Section>

              {/* 26. Entire Agreement */}
              <Section
                id="entire-agreement"
                title="26. Entire Agreement"
                active={activeSection === 'entire-agreement'}
              >
                <p>
                  These Terms, along with the Privacy Policy and any program-specific agreements or terms presented to you, constitute the entire agreement between you and Proprupee regarding your use of the Services.
                </p>
                <p>
                  These Terms supersede all prior negotiations, agreements, understandings, and communications, whether written or oral. No course of dealing, course of performance, or trade usage will modify these Terms unless expressly agreed to in writing by Proprupee's authorized representative.
                </p>
              </Section>

              {/* 27. Contact */}
              <Section
                id="contact"
                title="27. Contact"
                active={activeSection === 'contact'}
              >
                <h4 className="font-bold text-white mt-4 mb-2">Contact Information</h4>
                <p>
                  If you have questions, concerns, or requests regarding these Terms & Conditions, please contact:
                </p>
                <div className="mt-4 space-y-2 text-slate-300">
                  <p><strong>Organization:</strong> Proprupee</p>
                  <p><strong>Website:</strong> proprupee.com</p>
                  <p><strong>Email:</strong> support@proprupee.com</p>
                  <p className="text-xs text-slate-500 italic">[ADDRESS AND OTHER CONTACT DETAILS TO BE UPDATED]</p>
                </div>

                <p className="mt-4">
                  Proprupee will make reasonable efforts to respond to inquiries within 5-7 business days.
                </p>
              </Section>

              {/* Closing CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-12 p-6 rounded-lg border border-primary/30 bg-primary/10"
              >
                <h3 className="text-lg font-bold text-white mb-3">Got Questions?</h3>
                <p className="text-slate-300 mb-4">
                  If you have any questions about these Terms & Conditions or Proprupee's policies, please reach out to our support team.
                </p>
                <button
                  onClick={() => window.location.href = 'mailto:support@proprupee.com'}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Contact Support
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            </main>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {isSticky && (
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveSection('introduction');
          }}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-all shadow-lg"
          aria-label="Back to top"
        >
          <ChevronUp size={24} />
        </button>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050812] px-4 py-8 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-slate-400">
          <p>© 2026 Proprupee. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  active: boolean;
}

const Section: React.FC<SectionProps> = ({ id, title, children, active }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true, margin: '-100px' }}
    className={`scroll-mt-24 rounded-lg border transition-all ${
      active
        ? 'border-primary/50 bg-primary/5 p-6'
        : 'border-white/10 bg-white/[0.035] p-6'
    }`}
  >
    <h2 className="text-2xl font-black text-white mb-4">{title}</h2>
    <div className="space-y-4 text-slate-300 leading-relaxed">
      {children}
    </div>
  </motion.section>
);

export default TermsAndConditions;
