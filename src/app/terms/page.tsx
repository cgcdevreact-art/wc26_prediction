import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export const metadata: Metadata = {
  title: "Terms & Conditions - WC26 Predict",
  description:
    "Read the WC26 Predict Terms & Conditions covering eligibility, subscriptions, platform use, AI outputs, and liability limitations.",
};

interface TermsSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

const termsSections: TermsSection[] = [
  {
    title: "1. Eligibility",
    paragraphs: [
      "To use this Platform, you must:",
    ],
    items: [
      "Be at least 18 years old, or the legal age in your jurisdiction",
      "Have legal capacity to enter into binding agreements",
      "Comply with all applicable laws and regulations",
    ],
  },
  {
    title: "2. Nature of the Platform",
    paragraphs: [
      "my2026wcprediction.com is an AI-enhanced football prediction platform that combines user football knowledge, historical statistics, predictive analytics, machine learning, and numerical simulation models.",
      "The Platform is designed for informational, analytical, and entertainment purposes only.",
      "We do not guarantee prediction accuracy.",
    ],
  },
  {
    title: "3. No Betting or Gambling Services",
    paragraphs: [
      "We do not provide betting services, gambling operations, sportsbook functionality, or wager facilitation.",
      "Use of Platform insights for betting or gambling is solely at your own risk.",
      "You are responsible for complying with your local laws regarding sports wagering.",
    ],
  },
  {
    title: "4. User Accounts",
    paragraphs: [
      "To access certain features, you may need to create an account.",
      "You agree to:",
    ],
    items: [
      "Provide accurate and complete information",
      "Maintain the confidentiality of your login credentials",
      "Be responsible for all activity under your account",
      "Notify us immediately of unauthorized access",
    ],
  },
  {
    title: "5. User Conduct",
    paragraphs: [
      "You agree not to:",
    ],
    items: [
      "Use the Platform for unlawful purposes",
      "Attempt to manipulate prediction engines or leaderboards",
      "Use bots, scrapers, or automated systems without permission",
      "Upload harmful code, malware, or malicious scripts",
      "Harass, abuse, or impersonate others",
      "Post false, offensive, defamatory, or misleading content",
      "Interfere with Platform security or operations",
    ],
  },
  {
    title: "6. Intellectual Property",
    paragraphs: [
      "All Platform content, including software, AI models, simulation engines, algorithms, graphics, logos, design elements, databases, and written content, is owned by or licensed to my2026wcprediction.com and protected under applicable intellectual property laws.",
      "You may not copy, reverse engineer, reproduce, resell, redistribute, or modify Platform content without written permission.",
    ],
  },
  {
    title: "7. User-Generated Content",
    paragraphs: [
      "You may submit predictions, rankings, comments, insights, and community analysis.",
      "By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute such content for Platform operations, analytics, and promotional purposes.",
      "You remain responsible for your submitted content, and we reserve the right to remove content at our discretion.",
    ],
  },
  {
    title: "8. AI Outputs and Accuracy",
    paragraphs: [
      "Our AI systems generate predictive outputs based on available data and user inputs.",
      "You acknowledge that:",
    ],
    items: [
      "AI outputs may be inaccurate or incomplete",
      "Predictions are probabilistic, not factual guarantees",
      "Historical patterns do not assure future outcomes",
    ],
  },
  {
    title: "9. Competitions and Leaderboards",
    paragraphs: [
      "If we offer contests, rankings, or rewards, additional contest-specific rules may apply.",
      "We reserve the right to verify results, disqualify fraudulent behavior, and make final decisions on rankings and outcomes.",
      "Prize eligibility may be subject to local legal restrictions.",
    ],
  },
  {
    title: "10. Subscription and Paid Services",
    paragraphs: [
      "Certain premium features may require payment.",
      "By purchasing premium services:",
    ],
    items: [
      "You agree to pay applicable fees",
      "Fees may be recurring where stated",
      "Payments may be processed by third-party providers",
      "Unless otherwise stated, fees are non-refundable",
    ],
  },
  {
    title: "11. Third-Party Services",
    paragraphs: [
      "The Platform may integrate or link to third-party services, APIs, data feeds, or websites.",
      "We do not control and are not responsible for third-party content, service interruptions, data inaccuracies, or privacy practices.",
      "Use of third-party services is at your own risk.",
    ],
  },
  {
    title: "12. Disclaimer of Warranties",
    paragraphs: [
      "The Platform is provided as is and as available.",
      "We make no warranties, express or implied, regarding accuracy, reliability, availability, security, fitness for a particular purpose, or non-infringement.",
      "We do not guarantee uninterrupted or error-free service.",
    ],
  },
  {
    title: "13. Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, my2026wcprediction.com shall not be liable for betting losses, financial losses, lost profits, data loss, indirect damages, consequential damages, or business interruption arising from use of the Platform.",
      "Your sole remedy for dissatisfaction is to discontinue use.",
    ],
  },
  {
    title: "14. Indemnification",
    paragraphs: [
      "You agree to indemnify and hold harmless my2026wcprediction.com, its owners, affiliates, developers, and partners from claims, damages, liabilities, and expenses arising from your use of the Platform, your violation of these Terms, your misuse of predictions or content, or your violation of applicable laws.",
    ],
  },
  {
    title: "15. Termination",
    paragraphs: [
      "We may suspend or terminate your access at any time if you violate these Terms, if we suspect fraudulent activity, if required by law, or if Platform operations are discontinued.",
      "Termination does not affect accrued rights or liabilities.",
    ],
  },
  {
    title: "16. Privacy",
    paragraphs: [
      "Your use of the Platform is also governed by our Privacy Policy.",
      "By using the Platform, you consent to our collection and processing of data as described there.",
    ],
  },
  {
    title: "17. Governing Law",
    paragraphs: [
      "These Terms shall be governed by and construed under the laws applicable to the operator's principal jurisdiction, without regard to conflict of law principles.",
      "Any disputes shall be subject to the exclusive jurisdiction of the competent courts in that jurisdiction, unless applicable law requires otherwise.",
    ],
  },
  {
    title: "18. Changes to Terms",
    paragraphs: [
      "We reserve the right to modify these Terms at any time.",
      "Updated versions will be posted on this page.",
      "Your continued use of the Platform after changes means you accept the revised Terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="container mx-auto max-w-6xl flex-grow px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
            <FileText className="h-3.5 w-3.5" />
            <span>Legal Terms</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Terms & <span className="text-gradient">Conditions</span>
          </h1>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Effective Date:</span>{" "}
              June 10, 2026
            </p>
            <p>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Last Updated:</span>{" "}
              June 10, 2026
            </p>
          </div>
        </div>

        <div className="space-y-10 rounded-3xl border border-slate-200/50 bg-white/50 p-6 shadow-xl backdrop-blur-md dark:border-white/5 dark:bg-white/[0.02] sm:p-10">
          <section className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Welcome to <strong>my2026wcprediction.com</strong> (&ldquo;Platform,&rdquo; &ldquo;Website,&rdquo;
              &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;).
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              These Terms of Use govern your access to and use of our football prediction platform, including all
              tools, simulations, content, services, and features available on or through my2026wcprediction.com.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              By accessing or using the Platform, you agree to be legally bound by these Terms. If you do not agree,
              do not use the Platform.
            </p>
          </section>

          {termsSections.map((section, index) => (
            <section key={section.title} className="space-y-6">
              {index > 0 ? <hr className="border-slate-200/50 dark:border-white/5" /> : null}
              <div className="space-y-3">
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {section.title}
                </h2>

                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {paragraph}
                  </p>
                ))}

                {section.items ? (
                  <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ))}

          <hr className="border-slate-200/50 dark:border-white/5" />

          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">19. Contact Information</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              For legal or support inquiries:
            </p>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <strong>my2026wcprediction.com</strong>
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                <strong>Email:</strong>{" "}
                <a href="mailto:legal@my2026wcprediction.com" className="font-semibold text-primary hover:underline">
                  legal@my2026wcprediction.com
                </a>
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                <strong>Website:</strong> my2026wcprediction.com
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
