import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronUp, AlertTriangle, Menu, X } from 'lucide-react';
import { APP_NAME } from './BrandLogo';

interface TOCItem {
  id: string;
  title: string;
}

const tableOfContents: TOCItem[] = [
  { id: 'important-notice', title: '1. Important Risk Notice' },
  { id: 'no-guarantee-profits', title: '2. No Guarantee of Profits' },
  { id: 'market-risk', title: '3. Market Risk' },
  { id: 'leverage-risk', title: '4. Leverage and Loss Risk' },
  { id: 'evaluation-risk', title: '5. Evaluation Program Risk' },
  { id: 'funding-not-guaranteed', title: '6. Funding Is Not Guaranteed' },
  { id: 'simulated-environment', title: '7. Simulated / Evaluation Environment' },
  { id: 'technical-risks', title: '8. Technical and Platform Risks' },
  { id: 'market-data-risks', title: '9. Market Data and Execution Risks' },
  { id: 'human-error', title: '10. Human Error' },
  { id: 'third-party-risks', title: '11. Third-Party Risks' },
  { id: 'currency-payment-risks', title: '12. Currency / Payment Risks' },
  { id: 'regulatory-risk', title: '13. Regulatory and Legal Risk' },
  { id: 'tax-responsibility', title: '14. Tax Responsibility' },
  { id: 'independent-decision', title: '15. Independent Decision-Making' },
  { id: 'no-investment-advice', title: '16. No Investment Advice' },
  { id: 'responsible-participation', title: '17. Responsible Participation' },
  { id: 'changes-programs', title: '18. Changes to Programs' },
  { id: 'no-financial-promise', title: '19. No Financial Promise' },
  { id: 'acknowledgement', title: '20. Acknowledgement' },
  { id: 'contact', title: '21. Contact' },
];

const RiskDisclosure: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('important-notice');
  const [showTOC, setShowTOC] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Set document title and meta tags for SEO
  useEffect(() => {
    document.title = 'Risk Disclosure | Proprupee';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Read Proprupee\'s Risk Disclosure explaining trading, market, technical, evaluation, payout and other risks associated with using our platform and trading-related programs.');
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', 'https://proprupee.com/risk-disclaimer');
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
    <a href={href} className="text-primary hover:underline">
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
          <h1 className="text-lg font-bold text-white">Risk Disclosure</h1>
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
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h1 className="text-4xl sm:text-5xl font-black text-white">Risk Disclosure</h1>
            </div>
            <p className="text-slate-400 text-sm">Last Updated: September 2026</p>
            <div className="mt-6 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
              <p className="text-red-300 text-sm font-semibold">
                ⚠️ Important: Trading and financial markets involve substantial risk. You may lose money. Please read this disclosure carefully before participating in any trading-related activity.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Mobile TOC Toggle */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-white/10 bg-white/[0.045] text-white font-bold hover:bg-white/[0.075] transition-colors"
              >
                <span>Risk Sections</span>
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
                  In This Guide
                </h3>
                <nav className="space-y-2">
                  {tableOfContents.map(item => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`block w-full text-left text-sm px-3 py-2 rounded transition-all ${
                        activeSection === item.id
                          ? 'bg-red-500/20 text-red-400 font-bold border-l-2 border-red-500'
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
              {/* 1. Important Risk Notice */}
              <Section
                id="important-notice"
                title="1. Important Risk Notice"
                active={activeSection === 'important-notice'}
              >
                <p>
                  Trading and financial markets involve substantial risk. Market prices can move rapidly and unexpectedly. Participating in any trading-related activity, including evaluation programs offered by Proprupee, carries the possibility of financial loss.
                </p>
                <p>
                  Before participating in any Proprupee program or trading activity, you should carefully consider:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Your financial circumstances and resources</li>
                  <li>Your knowledge and experience with trading and financial markets</li>
                  <li>Your risk tolerance and comfort with potential losses</li>
                  <li>Whether you can afford to lose money without affecting your essential financial obligations</li>
                </ul>
                <p className="mt-4">
                  Only participate in trading or Proprupee programs if you have fully understood the risks and are prepared to accept the possibility of losing your capital or evaluation fees.
                </p>
              </Section>

              {/* 2. No Guarantee of Profits */}
              <Section
                id="no-guarantee-profits"
                title="2. No Guarantee of Profits"
                active={activeSection === 'no-guarantee-profits'}
              >
                <p>
                  Proprupee does not guarantee:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Trading profits or positive returns</li>
                  <li>Successful evaluation or program completion</li>
                  <li>Funding, capital allocation, or financial opportunities</li>
                  <li>A specific return amount, percentage, or payout</li>
                  <li>Future trading results or performance</li>
                  <li>Any other financial benefit or outcome</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Past Performance Is Not Indicative of Future Results</h4>
                <p>
                  Any historical performance data, simulated trading results, or past examples shown on Proprupee's platform or in communications should not be interpreted as a guarantee or prediction of future performance. Market conditions change, and past success does not ensure future success.
                </p>
              </Section>

              {/* 3. Market Risk */}
              <Section
                id="market-risk"
                title="3. Market Risk"
                active={activeSection === 'market-risk'}
              >
                <p>
                  Financial markets can move rapidly and unexpectedly. Market prices are influenced by numerous factors, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Market volatility and price fluctuations</li>
                  <li>Economic events, announcements, and data releases</li>
                  <li>Company announcements and earnings reports</li>
                  <li>Geopolitical events and global developments</li>
                  <li>Changes in interest rates and monetary policy</li>
                  <li>Market liquidity conditions</li>
                  <li>News and media reports</li>
                  <li>Regulatory changes or policy decisions</li>
                  <li>Other unforeseen market factors</li>
                </ul>

                <p className="mt-4">
                  As a trader, you may experience rapid losses as a result of these market movements. Even traders with knowledge and experience can experience significant losses during periods of market volatility or unexpected market events.
                </p>
              </Section>

              {/* 4. Leverage and Loss Risk */}
              <Section
                id="leverage-risk"
                title="4. Leverage and Loss Risk"
                active={activeSection === 'leverage-risk'}
              >
                <p className="text-slate-300 italic">
                  [If Proprupee's programs include leveraged trading or margin trading, this section applies. If leverage is not applicable to current programs, this section may be omitted or marked as not currently applicable.]
                </p>

                <p className="mt-4">
                  Leverage (or margin trading) allows traders to control a larger position with a smaller amount of capital. While leverage can increase potential gains, it also significantly increases exposure to losses.
                </p>

                <h4 className="font-bold text-white mt-4 mb-2">Understanding Leverage Risk</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>A small adverse price movement can result in large losses</li>
                  <li>Losses can exceed the capital you have allocated</li>
                  <li>Margin calls or forced liquidation may occur</li>
                  <li>You may be required to add additional funds to maintain positions</li>
                </ul>

                <p className="mt-4">
                  Leverage is a powerful tool but should be used with extreme caution and only if you fully understand the risks involved.
                </p>
              </Section>

              {/* 5. Evaluation Program Risk */}
              <Section
                id="evaluation-risk"
                title="5. Evaluation Program Risk"
                active={activeSection === 'evaluation-risk'}
              >
                <p>
                  Proprupee's evaluation programs have specific requirements and rules. Participation involves the risk of not meeting applicable program criteria, which may result in:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Profit targets not being achieved</li>
                  <li>Exceeding maximum drawdown or daily loss limits</li>
                  <li>Violating trading restrictions or prohibited strategies</li>
                  <li>Failing to meet minimum trading requirements</li>
                  <li>Failing to comply with other program-specific rules</li>
                </ul>

                <p className="mt-4">
                  If you fail to satisfy the applicable requirements, the evaluation may end, and you may become ineligible for further participation in that program or other programs. You may lose your evaluation fee without receiving any compensation or payout.
                </p>

                <h4 className="font-bold text-white mt-4 mb-2">Program Rules</h4>
                <p>
                  Each Proprupee program has its own specific rules and requirements. It is your responsibility to thoroughly review and understand the program rules that apply to you before participating. Program rules may include specific guidance on trading restrictions, position limits, and other requirements.
                </p>
              </Section>

              {/* 6. Funding Is Not Guaranteed */}
              <Section
                id="funding-not-guaranteed"
                title="6. Funding Is Not Guaranteed"
                active={activeSection === 'funding-not-guaranteed'}
              >
                <p>
                  Completing an interview, registration, payment, evaluation, or assessment with Proprupee does NOT automatically guarantee a funding opportunity, capital allocation, profit-sharing arrangement, or any other financial benefit.
                </p>

                <h4 className="font-bold text-white mt-4 mb-2">Additional Verification and Assessment</h4>
                <p>
                  After participating in an evaluation or meeting initial criteria, Proprupee may conduct:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Additional identity verification and KYC/AML checks</li>
                  <li>Background verification and compliance review</li>
                  <li>Risk assessment and suitability evaluation</li>
                  <li>Review of trading patterns and activity</li>
                  <li>Assessment of other applicable requirements</li>
                </ul>

                <p className="mt-4">
                  Proprupee reserves the right to decline funding or further participation for any reason, including but not limited to compliance concerns, risk factors, program changes, or other business considerations.
                </p>

                <p>
                  Do not interpret any communication from Proprupee, including approval for an evaluation, as a guarantee of funding or financial opportunity. Funding decisions are made at Proprupee's sole discretion and are subject to all applicable verification, compliance, and risk assessment requirements.
                </p>
              </Section>

              {/* 7. Simulated / Evaluation Environment */}
              <Section
                id="simulated-environment"
                title="7. Simulated / Evaluation Environment"
                active={activeSection === 'simulated-environment'}
              >
                <p>
                  Where applicable, Proprupee may provide a simulated or technology-based trading environment for evaluation purposes. In such environments:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Figures displayed may represent simulated trading results or virtual balances</li>
                  <li>Simulated balances are not actual funds deposited by or owed to the participant</li>
                  <li>Simulated trading does not involve real money or real market orders</li>
                  <li>Market data may be real or simulated, depending on program configuration</li>
                  <li>Order execution may be simulated or may differ from live market execution</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Limitations of Simulated Trading</h4>
                <p>
                  Performance in a simulated environment does not guarantee performance in real trading with real funds. Simulated trading has limitations:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>There is no real financial risk or actual consequences</li>
                  <li>Execution prices and slippage may differ from real markets</li>
                  <li>Liquidity conditions may not reflect real-world conditions</li>
                  <li>Trader psychology and discipline may differ when real funds are at risk</li>
                </ul>

                <p className="mt-4">
                  Success in an evaluation environment should not be interpreted as evidence of trading ability or future success in real-money trading.
                </p>
              </Section>

              {/* 8. Technical and Platform Risks */}
              <Section
                id="technical-risks"
                title="8. Technical and Platform Risks"
                active={activeSection === 'technical-risks'}
              >
                <p>
                  Proprupee's platform depends on internet connectivity, servers, software, and various third-party services, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Web hosting infrastructure</li>
                  <li>Third-party APIs and integrations</li>
                  <li>Market data providers</li>
                  <li>Payment processors and financial service providers</li>
                  <li>Authentication and security services</li>
                  <li>Trading infrastructure (where applicable)</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Potential Technical Issues</h4>
                <p>
                  Technical issues, outages, delays, errors, maintenance, or other disruptions may occur, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Platform unavailability or downtime</li>
                  <li>Slow or delayed response times</li>
                  <li>Data errors or inaccuracies</li>
                  <li>Connectivity problems</li>
                  <li>Bugs or software errors</li>
                  <li>Maintenance windows</li>
                  <li>Third-party service interruptions</li>
                </ul>

                <p className="mt-4">
                  Proprupee does not guarantee 100% uptime or error-free operation. You use the platform at your own risk. Proprupee is not liable for losses resulting from technical issues, service disruptions, or third-party failures.
                </p>
              </Section>

              {/* 9. Market Data and Execution Risks */}
              <Section
                id="market-data-risks"
                title="9. Market Data and Execution Risks"
                active={activeSection === 'market-data-risks'}
              >
                <h4 className="font-bold text-white mb-2">Market Data Risks</h4>
                <p>
                  Market data may be:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Delayed due to exchange or data provider delays</li>
                  <li>Temporarily unavailable</li>
                  <li>Affected by technical issues</li>
                  <li>Inaccurate or contain errors</li>
                  <li>Interrupted during market hours or maintenance</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Trading Execution Risks</h4>
                <p>
                  Where trading execution is applicable, order execution and fills may be affected by:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Network latency and communication delays</li>
                  <li>Market liquidity and available spreads</li>
                  <li>Slippage (difference between expected and actual execution price)</li>
                  <li>Market conditions and price movements</li>
                  <li>System availability and technical constraints</li>
                  <li>Broker or exchange limitations</li>
                </ul>

                <p className="mt-4">
                  You are responsible for monitoring market data and understanding the conditions under which your trades are executed.
                </p>
              </Section>

              {/* 10. Human Error */}
              <Section
                id="human-error"
                title="10. Human Error"
                active={activeSection === 'human-error'}
              >
                <p>
                  You are responsible for the accuracy of information you enter into the Proprupee platform, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Trading orders and order parameters</li>
                  <li>Account registration and profile information</li>
                  <li>Login credentials and security settings</li>
                  <li>Payment and banking information</li>
                  <li>Program selections and settings</li>
                  <li>Any other information entered into the platform</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Consequences of Errors</h4>
                <p>
                  Errors or mistakes in information you provide or actions you take may result in:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Unintended trades or orders being executed</li>
                  <li>Account access issues or security problems</li>
                  <li>Incorrect billing or payment processing</li>
                  <li>Enrollment in wrong programs or incorrect evaluation terms</li>
                  <li>Other unintended consequences</li>
                </ul>

                <p className="mt-4">
                  You are responsible for reviewing your actions and information before confirming them. Proprupee is not responsible for losses or damages resulting from errors or mistakes you make, subject to applicable law.
                </p>
              </Section>

              {/* 11. Third-Party Risks */}
              <Section
                id="third-party-risks"
                title="11. Third-Party Risks"
                active={activeSection === 'third-party-risks'}
              >
                <p>
                  Proprupee relies on various third-party service providers for critical functions, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Market data and pricing information</li>
                  <li>Trading infrastructure and execution</li>
                  <li>Brokers and exchanges</li>
                  <li>Payment processing and funds transfer</li>
                  <li>Web hosting and infrastructure</li>
                  <li>Identity verification and KYC services</li>
                  <li>Other critical services</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Third-Party Service Disruptions</h4>
                <p>
                  Third-party providers may experience:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Service outages or interruptions</li>
                  <li>Technical failures or problems</li>
                  <li>Changes in service terms or pricing</li>
                  <li>Security incidents or breaches</li>
                  <li>Policy changes affecting service availability</li>
                </ul>

                <p className="mt-4">
                  Proprupee is not liable for third-party service disruptions or failures. Each third-party service is governed by its own terms and conditions, which you should review where applicable.
                </p>
              </Section>

              {/* 12. Currency / Payment Risks */}
              <Section
                id="currency-payment-risks"
                title="12. Currency / Payment Risks"
                active={activeSection === 'currency-payment-risks'}
              >
                <p>
                  Depending on your location and the Proprupee payment or payout method, currency conversion may apply, including:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Exchange rate fluctuations affecting the amount received or paid</li>
                  <li>Payment processor fees and charges</li>
                  <li>Bank fees associated with receiving or transferring funds</li>
                  <li>Currency conversion markups or premiums</li>
                </ul>

                <p className="mt-4">
                  The actual amount received after conversion and fees may be significantly less than the amount approved or requested. You are responsible for understanding the fees and exchange rates applicable to your payments and payouts.
                </p>

                <p>
                  Proprupee is not responsible for currency conversion rates, payment processor fees, or banking charges. If you have questions about fees or conversion rates, contact your payment provider or bank for details.
                </p>
              </Section>

              {/* 13. Regulatory and Legal Risk */}
              <Section
                id="regulatory-risk"
                title="13. Regulatory and Legal Risk"
                active={activeSection === 'regulatory-risk'}
              >
                <p>
                  Laws and regulations applicable to financial markets, technology platforms, online payments, and trading services may change at any time. These changes could affect:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>The availability or terms of Proprupee's services</li>
                  <li>Your ability to participate in trading or programs</li>
                  <li>Fees, taxes, or other requirements</li>
                  <li>Your rights and obligations</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Your Regulatory Responsibility</h4>
                <p>
                  You are responsible for understanding the laws and regulations applicable to you in your jurisdiction. This includes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Regulations applicable to trading or financial markets</li>
                  <li>Restrictions on participation in certain programs</li>
                  <li>Licensing or registration requirements that may apply to you</li>
                  <li>Tax obligations arising from your activity</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">What Proprupee Does NOT Represent</h4>
                <p className="text-sm text-slate-300">
                  ⚠️ Proprupee does NOT represent or claim that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Proprupee is registered with or approved by SEBI or any other financial regulator</li>
                  <li>Proprupee is regulated or exempt from regulation</li>
                  <li>Proprupee's services are authorized or licensed</li>
                  <li>Proprupee's services comply with all regulatory requirements</li>
                </ul>

                <p className="mt-4">
                  If you have questions about regulatory compliance or your specific situation, consult with an appropriately qualified legal professional in your jurisdiction.
                </p>
              </Section>

              {/* 14. Tax Responsibility */}
              <Section
                id="tax-responsibility"
                title="14. Tax Responsibility"
                active={activeSection === 'tax-responsibility'}
              >
                <p>
                  Depending on your circumstances and jurisdiction, you may have tax obligations arising from:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Payments or fees paid to participate in programs</li>
                  <li>Profits, gains, or income from trading activity</li>
                  <li>Rewards or bonuses received</li>
                  <li>Payouts or distributions from Proprupee</li>
                  <li>Other financial activity</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Proprupee Does Not Provide Tax Advice</h4>
                <p>
                  Proprupee does not provide individual tax advice or guidance. Tax obligations vary based on your personal circumstances, location, and the specific nature of your activity. You are responsible for:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Understanding your tax obligations</li>
                  <li>Calculating and paying applicable taxes</li>
                  <li>Filing required tax returns</li>
                  <li>Maintaining appropriate records</li>
                </ul>

                <p className="mt-4">
                  You should consult with an appropriately qualified tax professional or accountant if you have questions about your tax obligations.
                </p>
              </Section>

              {/* 15. Independent Decision-Making */}
              <Section
                id="independent-decision"
                title="15. Independent Decision-Making"
                active={activeSection === 'independent-decision'}
              >
                <p>
                  You are solely responsible for your own decisions regarding participation in Proprupee's platform and programs. You should:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Carefully review all applicable program rules and requirements</li>
                  <li>Independently assess the risks involved</li>
                  <li>Consider your personal financial circumstances</li>
                  <li>Determine whether participation is appropriate for you</li>
                  <li>Make your own informed decision without relying solely on Proprupee's guidance</li>
                </ul>

                <p className="mt-4">
                  Information or guidance provided by Proprupee should not be interpreted as a recommendation that you participate in any program or engage in any trading activity. Proprupee does not know your personal circumstances and cannot assess whether participation is appropriate for you.
                </p>
              </Section>

              {/* 16. No Investment Advice */}
              <Section
                id="no-investment-advice"
                title="16. No Investment Advice"
                active={activeSection === 'no-investment-advice'}
              >
                <p>
                  Any educational materials, market information, analysis, charts, trading ideas, or communications provided through Proprupee are for informational and educational purposes only. Such information does NOT constitute:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Personalized investment advice or recommendations</li>
                  <li>Portfolio management or advisory services</li>
                  <li>A recommendation to buy, sell, or hold any security</li>
                  <li>Financial advice or guidance</li>
                  <li>An offer or solicitation for any financial product</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Your Responsibility</h4>
                <p>
                  Before making any investment or trading decision, you should independently verify all information and consult with qualified financial, legal, or tax professionals as appropriate to your circumstances. You make all investment decisions at your own discretion and risk.
                </p>
              </Section>

              {/* 17. Responsible Participation */}
              <Section
                id="responsible-participation"
                title="17. Responsible Participation"
                active={activeSection === 'responsible-participation'}
              >
                <p>
                  Before participating in any Proprupee program, you should:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Fully understand the program rules and requirements</li>
                  <li>Review all applicable fees and costs</li>
                  <li>Understand the risks of the program</li>
                  <li>Understand the conditions for evaluation termination or failure</li>
                  <li>Understand the payout conditions and requirements</li>
                  <li>Carefully consider whether participation is appropriate for your situation</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Do Not Risk What You Cannot Afford to Lose</h4>
                <p>
                  Only participate in trading or Proprupee programs using funds that you can afford to lose completely. Do not:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Use funds needed for essential living expenses</li>
                  <li>Borrow funds to participate</li>
                  <li>Risk money needed for other important financial obligations</li>
                  <li>Participate beyond your financial means or risk tolerance</li>
                </ul>

                <p className="mt-4">
                  If you have questions about whether a program is appropriate for you, do not participate until you have fully understood the risks and requirements.
                </p>
              </Section>

              {/* 18. Changes to Programs */}
              <Section
                id="changes-programs"
                title="18. Changes to Programs"
                active={activeSection === 'changes-programs'}
              >
                <p>
                  Proprupee may update, modify, suspend, or discontinue programs, features, technology, fees, rules, or other conditions at any time, subject to applicable law and these Terms & Conditions. Changes may include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>Changes to program rules or requirements</li>
                  <li>Changes to evaluation criteria or performance targets</li>
                  <li>Changes to fees or costs</li>
                  <li>Changes to eligibility requirements</li>
                  <li>Changes to payout conditions</li>
                  <li>Suspension or discontinuation of programs</li>
                </ul>

                <h4 className="font-bold text-white mt-4 mb-2">Review Current Program Rules</h4>
                <p>
                  It is your responsibility to review the current, applicable program rules and requirements before and during your participation. Proprupee will make reasonable efforts to notify you of material changes, but you should not rely solely on such notifications.
                </p>
              </Section>

              {/* 19. No Financial Promise */}
              <Section
                id="no-financial-promise"
                title="19. No Financial Promise"
                active={activeSection === 'no-financial-promise'}
              >
                <p>
                  References in Proprupee communications to terms such as:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>"Funding opportunity"</li>
                  <li>"Profit split" or "profit share"</li>
                  <li>"Trading capital"</li>
                  <li>"Evaluation program"</li>
                  <li>"Payout" or "payout conditions"</li>
                  <li>Similar terms</li>
                </ul>

                <p className="mt-4">
                  These terms should NOT be interpreted as:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>A promise or guarantee that you will receive funding or capital</li>
                  <li>A promise of specific profits or returns</li>
                  <li>A guarantee of any financial outcome</li>
                  <li>A guarantee that every participant will receive payouts</li>
                  <li>Any other financial commitment from Proprupee</li>
                </ul>

                <p className="mt-4">
                  All such references should be understood in the context of the specific program terms and conditions, which govern the actual rights and obligations of participants.
                </p>
              </Section>

              {/* 20. Acknowledgement */}
              <Section
                id="acknowledgement"
                title="20. Acknowledgement"
                active={activeSection === 'acknowledgement'}
              >
                <p>
                  By accessing and using Proprupee's services and programs, you acknowledge and confirm that:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                  <li>You have had an opportunity to review the Proprupee Terms & Conditions</li>
                  <li>You have reviewed the applicable program rules</li>
                  <li>You have reviewed this Risk Disclosure</li>
                  <li>You understand the risks associated with trading and program participation</li>
                  <li>You understand that losses can occur</li>
                  <li>You are comfortable with the risks described in this disclosure</li>
                  <li>Your participation is voluntary and at your own risk</li>
                  <li>You have made an informed decision to participate</li>
                </ul>

                <p className="mt-4">
                  If you do not understand the risks or feel uncomfortable with them, you should not participate in Proprupee's programs or platform.
                </p>
              </Section>

              {/* 21. Contact */}
              <Section
                id="contact"
                title="21. Contact"
                active={activeSection === 'contact'}
              >
                <h4 className="font-bold text-white mb-4">If You Have Questions About This Risk Disclosure</h4>
                <div className="space-y-3 text-slate-300">
                  <p><strong>Organization:</strong> Proprupee</p>
                  <p><strong>Website:</strong> proprupee.com</p>
                  <p><strong>Email:</strong> support@proprupee.com</p>
                  <p><strong className="text-slate-400 italic">[ADDRESS AND OTHER CONTACT DETAILS TO BE UPDATED]</strong></p>
                </div>

                <h4 className="font-bold text-white mt-6 mb-3">Related Documents</h4>
                <ul className="space-y-2 text-slate-300">
                  <li>• {renderSectionLink('/terms', 'Terms & Conditions')}</li>
                  <li>• {renderSectionLink('/privacy-policy', 'Privacy Policy')}</li>
                  <li>• {renderSectionLink('/refund-policy', 'Refund & Cancellation Policy')}</li>
                </ul>

                <p className="text-xs text-slate-500 mt-6">
                  Last Updated: September 2026
                </p>
              </Section>

              {/* Closing Notice */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-12 p-6 rounded-lg border border-red-500/30 bg-red-500/10"
              >
                <h3 className="text-lg font-bold text-red-300 mb-3">Final Notice</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  This Risk Disclosure is provided for informational purposes and does not constitute legal advice or a guarantee of compliance with applicable laws. Your participation in Proprupee's programs is entirely voluntary and at your own risk. You are responsible for understanding all applicable risks, terms, and requirements before participating. If you have any doubts or concerns, please do not participate or contact support@proprupee.com for clarification.
                </p>
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
            setActiveSection('important-notice');
          }}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
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
        ? 'border-red-500/50 bg-red-500/5 p-6'
        : 'border-white/10 bg-white/[0.035] p-6'
    }`}
  >
    <h2 className="text-2xl font-black text-white mb-4">{title}</h2>
    <div className="space-y-4 text-slate-300 leading-relaxed">
      {children}
    </div>
  </motion.section>
);

export default RiskDisclosure;
