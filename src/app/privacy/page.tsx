import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - WC26 Predict",
  description: "Learn how WC26 Predict collects, uses, stores, and protects your information.",
};

interface PolicyBlock {
  heading: string;
  body: string;
  items?: string[];
  note?: string;
}

interface PolicySection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  blocks?: PolicyBlock[];
  closing?: string;
}

const policySections: PolicySection[] = [
  {
    title: "1. Information We Collect",
    blocks: [
      {
        heading: "A. Personal Information",
        body:
          "When you register or interact with our platform, we may collect:",
        items: [
          "Full name",
          "Username",
          "Email address",
          "Country of residence",
          "Date of birth (where required)",
          "Profile image (optional)",
        ],
      },
      {
        heading: "B. Prediction & Gameplay Data",
        body:
          "To improve predictive modeling and user experience, we may collect:",
        items: [
          "Match predictions",
          "Team selections",
          "Statistical preferences",
          "Prediction confidence levels",
          "Historical prediction patterns",
          "AI simulator interaction data",
        ],
      },
      {
        heading: "C. Technical Data",
        body: "Automatically collected data may include:",
        items: [
          "IP address",
          "Browser type",
          "Device information",
          "Operating system",
          "Time zone",
          "Session activity",
          "Cookies and tracking identifiers",
        ],
      },
      {
        heading: "D. Payment Information (If Applicable)",
        body:
          "If premium features, contests, or subscriptions are introduced, we may collect:",
        items: ["Billing address", "Transaction records", "Payment status"],
        note:
          "We do not directly store payment card details. Payment processing may be handled by third-party providers.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    items: [
      "Operate and maintain the Platform",
      "Generate AI-enhanced football predictions",
      "Personalize simulation models based on user behavior",
      "Improve prediction accuracy and platform performance",
      "Analyze user engagement and platform trends",
      "Prevent fraud, abuse, and manipulation",
      "Send service notifications and updates",
      "Manage competitions, leaderboards, and rewards",
      "Comply with legal obligations",
    ],
  },
  {
    title: "3. AI and Prediction Processing",
    paragraphs: [
      "Our Platform uses machine learning models, numerical simulations, and algorithmic systems to enhance football predictions.",
      "By using the Platform, you acknowledge that:",
    ],
    items: [
      "Your prediction inputs may be analyzed to improve our models.",
      "AI-generated outputs are informational and entertainment-based.",
      "Predictions do not guarantee actual match outcomes.",
      "We may aggregate anonymized prediction patterns for research and optimization.",
    ],
  },
  {
    title: "4. Cookies and Tracking Technologies",
    paragraphs: [
      "We use cookies to maintain user sessions, remember preferences, improve website performance, analyze traffic, and deliver personalized content.",
      "You can disable cookies through your browser settings, but some features may not function properly.",
    ],
  },
  {
    title: "5. Sharing of Information",
    paragraphs: [
      "We do not sell your personal information.",
      "We may share your data only in these cases:",
    ],
    blocks: [
      {
        heading: "A. Service Providers",
        body: "With trusted vendors for:",
        items: [
          "Hosting",
          "Analytics",
          "Email delivery",
          "Payment processing",
          "Security monitoring",
        ],
      },
      {
        heading: "B. Legal Requirements",
        body: "If required by law, regulation, subpoena, or court order.",
      },
      {
        heading: "C. Business Transfers",
        body: "In connection with mergers, acquisitions, or sale of assets.",
      },
    ],
  },
  {
    title: "6. User-Generated Content",
    paragraphs: [
      "Predictions, comments, rankings, and leaderboard submissions may be visible to other users depending on platform settings.",
      "Please avoid posting personal or sensitive information publicly.",
    ],
  },
  {
    title: "7. Data Retention",
    paragraphs: [
      "We retain your information for as long as:",
    ],
    items: [
      "Your account remains active",
      "Necessary to provide services",
      "Required for legal, tax, or dispute resolution purposes",
    ],
    closing:
      "Inactive accounts may be deleted after a reasonable retention period.",
  },
  {
    title: "8. Data Security",
    paragraphs: [
      "We implement reasonable technical and organizational safeguards including:",
    ],
    items: [
      "Encryption",
      "Secure authentication",
      "Access controls",
      "Firewall protection",
      "Monitoring systems",
    ],
    closing: "However, no online platform is completely secure.",
  },
  {
    title: "9. International Users",
    paragraphs: [
      "Our services may be accessible globally. By using the Platform, you consent to the transfer and processing of your information in jurisdictions where our servers or service providers operate.",
    ],
  },
  {
    title: "10. Your Privacy Rights",
    paragraphs: [
      "Depending on your location, you may have rights to:",
    ],
    items: [
      "Access your personal data",
      "Correct inaccurate information",
      "Request deletion",
      "Restrict processing",
      "Object to certain uses",
      "Withdraw consent",
      "Request data portability",
    ],
    closing:
      "To exercise these rights, contact us at privacy@my2026wcprediction.com.",
  },
  {
    title: "11. Children's Privacy",
    paragraphs: [
      "Our Platform is not intended for children under 13 (or applicable age in your jurisdiction).",
      "We do not knowingly collect personal information from minors without proper consent.",
    ],
  },
  {
    title: "12. Third-Party Links",
    paragraphs: [
      "Our Platform may contain links to third-party websites, sports statistics providers, or partner services. We are not responsible for their privacy practices.",
    ],
  },
  {
    title: "13. Disclaimer on Betting and Gambling",
    paragraphs: [
      "my2026wcprediction.com is a football prediction and simulation platform for informational and entertainment purposes only.",
      "We do not operate as a betting company, sportsbook, or gambling service.",
      "Users are solely responsible for how they use predictive information.",
    ],
  },
  {
    title: "14. Changes to This Privacy Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised Last Updated date.",
      "Continued use of the Platform after changes constitutes acceptance.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Trust & Safety</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Privacy <span className="text-gradient">Policy</span>
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
              At my2026wcprediction.com, we value your privacy. This Privacy Policy explains how we collect,
              use, store, and protect your information when you use our football prediction platform, where
              users combine their football knowledge with artificial intelligence (AI) and advanced numerical
              simulation tools to generate predictive outcomes.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              By accessing or using our Platform, you agree to the practices described in this Privacy Policy.
            </p>
          </section>

          {policySections.map((section, index) => (
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

                {section.blocks?.map((block) => (
                  <div key={block.heading} className="space-y-3 rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      {block.heading}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{block.body}</p>
                    {block.items ? (
                      <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    {block.note ? (
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        <strong>Note:</strong> {block.note}
                      </p>
                    ) : null}
                  </div>
                ))}

                {section.closing ? (
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.closing}</p>
                ) : null}
              </div>
            </section>
          ))}

          <hr className="border-slate-200/50 dark:border-white/5" />

          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">15. Contact Us</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              For questions about this Privacy Policy:
            </p>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <strong>my2026wcprediction.com</strong>
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@my2026wcprediction.com" className="font-semibold text-primary hover:underline">
                  privacy@my2026wcprediction.com
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
