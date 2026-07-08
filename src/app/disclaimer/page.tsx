import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export const metadata: Metadata = {
  title: "Disclaimer - WC26 Predict",
  description:
    "Read the WC26 Predict disclaimer covering predictions, AI-generated insights, third-party data, and liability limitations.",
};

interface DisclaimerSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

const disclaimerSections: DisclaimerSection[] = [
  {
    title: "1. General Information Only",
    paragraphs: [
      "The content, predictions, simulations, analytics, and insights provided on my2026wcprediction.com are for informational, educational, and entertainment purposes only.",
      "While our platform combines user football knowledge, artificial intelligence, historical performance analysis, and numerical simulation models to produce high-fidelity predictions, we do not guarantee the accuracy, completeness, or reliability of any prediction.",
      "Football remains inherently unpredictable.",
    ],
  },
  {
    title: "2. No Guarantee of Outcomes",
    paragraphs: [
      "All match predictions, scoreline forecasts, player performance projections, and tournament simulations are probabilistic estimates only.",
      "We make no representation or warranty that:",
    ],
    items: [
      "Any prediction will be correct",
      "Any statistical model will reflect actual match outcomes",
      "AI-generated outputs will be error-free",
      "Historical data will predict future performance accurately",
    ],
  },
  {
    title: "3. Not Betting or Gambling Advice",
    paragraphs: [
      "my2026wcprediction.com is not a sportsbook, bookmaker, betting operator, gambling platform, or financial advisory service.",
      "Nothing on this Platform constitutes:",
    ],
    items: [
      "Betting advice",
      "Gambling recommendations",
      "Investment advice",
      "Financial guidance",
    ],
  },
  {
    title: "4. AI and Simulation Disclaimer",
    paragraphs: [
      "Our platform uses artificial intelligence models, predictive algorithms, statistical engines, numerical simulations, and user-generated football intelligence.",
      "These systems are experimental and continuously evolving.",
      "AI outputs may:",
    ],
    items: [
      "Contain inaccuracies",
      "Be influenced by incomplete data",
      "Produce unexpected results",
      "Differ from actual real-world outcomes",
    ],
  },
  {
    title: "5. User Responsibility",
    paragraphs: [
      "Users are solely responsible for:",
    ],
    items: [
      "Their interpretation of predictions",
      "Decisions made based on platform insights",
      "Compliance with local betting, gaming, and online activity laws",
      "Any financial or personal outcomes resulting from their use of the Platform",
    ],
  },
  {
    title: "6. No Professional Advice",
    paragraphs: [
      "The information on this Platform does not constitute professional advice of any kind, including:",
    ],
    items: [
      "Financial advice",
      "Legal advice",
      "Sports consultancy",
      "Gaming consultancy",
    ],
  },
  {
    title: "7. Third-Party Data and External Sources",
    paragraphs: [
      "Our predictions may rely on third-party data sources, sports feeds, historical records, and external APIs.",
      "We do not control or guarantee:",
    ],
    items: [
      "The accuracy of third-party data",
      "Availability of external services",
      "Timeliness of external statistics",
    ],
  },
  {
    title: "8. Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, my2026wcprediction.com and its owners, affiliates, partners, developers, and licensors shall not be liable for:",
    ],
    items: [
      "Direct losses",
      "Indirect losses",
      "Betting losses",
      "Lost profits",
      "Data loss",
      "Service interruptions",
      "Emotional distress",
      "Consequential damages",
    ],
  },
  {
    title: "9. Availability of Service",
    paragraphs: [
      "We do not guarantee uninterrupted or error-free access to the Platform.",
      "We may modify, suspend, or discontinue parts of the service at any time without notice.",
    ],
  },
  {
    title: "10. User-Generated Predictions",
    paragraphs: [
      "Users may contribute predictions, rankings, comments, or analytical inputs.",
      "We are not responsible for:",
    ],
    items: [
      "Accuracy of user-submitted content",
      "Offensive or misleading content",
      "Opinions expressed by users",
    ],
  },
  {
    title: "11. Age Restriction",
    paragraphs: [
      "This Platform is intended for users aged 18 years and above, or the legal age required in their jurisdiction for sports-related predictive engagement.",
      "By using the Platform, you confirm you meet this requirement.",
    ],
  },
  {
    title: "12. Jurisdiction and Compliance",
    paragraphs: [
      "Users are responsible for ensuring that their use of the Platform complies with local laws, regulations, and restrictions in their country or region.",
      "We make no representation that the Platform is lawful or appropriate in every jurisdiction.",
    ],
  },
  {
    title: "13. Changes to This Disclaimer",
    paragraphs: [
      "We reserve the right to update or revise this Disclaimer at any time.",
      "Changes will become effective immediately upon posting.",
      "Continued use of the Platform after updates constitutes acceptance.",
    ],
  },
];

export default function DisclaimerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="container mx-auto max-w-6xl flex-grow px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Important Notice</span>
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Platform <span className="text-gradient">Disclaimer</span>
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
              By accessing or using this Platform, you acknowledge and agree to the terms of this Disclaimer.
            </p>
          </section>

          {disclaimerSections.map((section, index) => (
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
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">14. Contact Us</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              For questions regarding this Disclaimer:
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
