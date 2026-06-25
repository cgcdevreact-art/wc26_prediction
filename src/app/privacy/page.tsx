import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - WC26 Predict",
  description: "Learn how WC26 Predict collects, uses, and safeguards your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Trust & Safety</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm">
            Last Updated: June 25, 2026
          </p>
        </div>

        <div className="bg-white/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-md space-y-10">
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                10A. Additional Privacy Rights for EU, UK, and California Residents
              </h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  A. GDPR & UK GDPR Compliance
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  If you are located in the European Economic Area (EEA), European Union (EU), or the United Kingdom (UK), you are entitled to additional rights under the <strong>General Data Protection Regulation (GDPR)</strong> and <strong>UK GDPR</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Legal Bases for Processing</h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  We process your personal data under one or more of the following legal bases:
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <li><strong>Consent</strong> – where you have given clear permission.</li>
                  <li><strong>Contractual Necessity</strong> – to provide and operate our services.</li>
                  <li><strong>Legitimate Interests</strong> – to improve our platform, security, and AI prediction systems.</li>
                  <li><strong>Legal Obligation</strong> – where required by law.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Your GDPR Rights</h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Subject to applicable law, you may have the right to:
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <li>Request access to your personal data.</li>
                  <li>Request correction of inaccurate or incomplete data.</li>
                  <li>Request deletion (&ldquo;Right to be Forgotten&rdquo;).</li>
                  <li>Request restriction of processing.</li>
                  <li>Object to processing based on legitimate interests.</li>
                  <li>Withdraw consent at any time.</li>
                  <li>Request portability of your data in a machine-readable format.</li>
                  <li>Lodge a complaint with your local data protection authority.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">International Data Transfers</h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Where your personal data is transferred outside the EEA or UK, we implement appropriate safeguards, including:
                </p>
                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <li>Standard Contractual Clauses (SCCs)</li>
                  <li>Contractual data protection obligations with service providers</li>
                  <li>Other legally recognized transfer mechanisms</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Automated Decision-Making</h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Our platform uses algorithmic analysis, AI systems, and numerical simulation to generate football predictions. These processes are designed for informational and entertainment purposes only and do not produce legal, financial, or similarly significant decisions affecting users.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-slate-200/50 dark:border-white/5" />

          <section className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                B. California Privacy Rights (CCPA/CPRA)
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                If you are a California resident, you may have rights under the <strong>California Consumer Privacy Act (CCPA)</strong> and <strong>California Privacy Rights Act (CPRA)</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Your California Rights</h4>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                You may have the right to:
              </p>
              <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>Know what personal information we collect.</li>
                <li>Know how we use and disclose your information.</li>
                <li>Request deletion of your personal information.</li>
                <li>Correct inaccurate personal information.</li>
                <li>Limit the use of sensitive personal information (if applicable).</li>
                <li>Request access to specific categories and pieces of personal data.</li>
                <li>Opt out of the sale or sharing of personal information.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Sale of Personal Information</h4>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                We do <strong>not sell</strong> your personal information as defined under the CCPA/CPRA.
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                If our business model changes in the future, we will provide a clear &ldquo;Do Not Sell or Share My Personal Information&rdquo; option where required by law.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Non-Discrimination</h4>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                We will not discriminate against you for exercising your privacy rights.
              </p>
            </div>
          </section>

          <hr className="border-slate-200/50 dark:border-white/5" />

          <section className="space-y-4">
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Exercising Your Rights
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              To submit privacy-related requests under GDPR, UK GDPR, CCPA, or CPRA, contact us:
            </p>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <strong>Email:</strong>{" "}
                <a href="mailto:privacy@my2026wcprediction.com" className="font-semibold text-primary hover:underline">
                  privacy@my2026wcprediction.com
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Please include:
              </p>
              <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>Your full name</li>
                <li>Registered email address</li>
                <li>Country or State of residence</li>
                <li>Nature of your request</li>
              </ul>
            </div>

            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              We may need to verify your identity before fulfilling certain requests.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
