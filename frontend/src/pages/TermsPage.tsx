import { useEffect } from "react";
import { Section } from "@/components/panchang/Section";
import { SUPPORT_EMAIL, CONTACT_EMAIL } from "@/lib/contact";
import { applySeo } from "@/lib/seo";

const GITHUB_URL = "https://github.com/bidyashish/vedicpanchanga.com";

export function TermsPage() {
  useEffect(() => {
    applySeo({
      title: "Terms of Use · Vedic Panchanga",
      description:
        "Terms of Use for vedicpanchanga.com - service is provided as-is with no warranty or guarantee of accuracy, plus the rules for optional accounts, saved charts and the Premium subscription.",
      canonical: "https://vedicpanchanga.com/terms",
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="py-6 space-y-6 max-w-3xl mx-auto">
      <header className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
          Terms of Use
        </h1>
        <p className="text-mini text-ink-soft">Last updated: October 2026</p>
        <nav className="pt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-mini">
          <a href="/" className="text-saffron hover:text-saffron-dark">
            Home
          </a>
          <span aria-hidden="true" className="text-ink-soft">
            ·
          </span>
          <a href="/privacy" className="text-saffron hover:text-saffron-dark">
            Privacy Policy
          </a>
          <span aria-hidden="true" className="text-ink-soft">
            ·
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-saffron hover:text-saffron-dark">
            Contact
          </a>
        </nav>
      </header>

      <Section title="Acceptance of Terms">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            By accessing or using <strong>vedicpanchanga.com</strong> (the "site"), you agree to be
            bound by these Terms of Use and the{" "}
            <a href="/privacy" className="text-saffron hover:text-saffron-dark underline">
              Privacy Policy
            </a>
            . If you do not agree, please do not use the site.
          </p>
        </div>
      </Section>

      <Section title="Service Description">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The site is a commercial, advertising-supported service that offers astronomical and
            astrological calculations including panchang, kundali, divisional charts, dasha, and
            muhurta search. Calculations are produced by software using the Swiss Ephemeris.
          </p>
          <p>
            All calculators are available without an account. Optionally you may create a free
            account to save charts, and subscribe to the paid <strong>Premium</strong> plan, which
            removes advertising and raises the number of charts you can save.
          </p>
        </div>
      </Section>

      <Section title="Accounts">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              You may sign up with Google or with an email address and password. You must be at
              least 13 years old (16 in the EEA / UK) to create an account.
            </li>
            <li>
              You are responsible for keeping your credentials confidential and for all activity
              under your account. Tell us promptly if you suspect unauthorised use.
            </li>
            <li>
              Provide a working email address: it is the only way to recover a forgotten password
              and to receive notices about your subscription.
            </li>
            <li>
              You can delete your account at any time from the Account page. Deletion is immediate
              and permanent and cancels any active subscription.
            </li>
            <li>
              We may suspend or close accounts that breach these Terms, abuse the service or remain
              in unpaid status.
            </li>
          </ul>
        </div>
      </Section>

      <Section title="Saved Charts">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            Birth details you save remain yours. You grant us only the right to store and process
            them so that we can show them back to you. Saved charts are private to your account; we
            do not publish or share them.
          </p>
          <p>
            Saving is a convenience, not an archive service: keep your own copy of important birth
            data. The number of charts you may save (currently 10 on the free plan and 200 on
            Premium) may change; we will not delete existing charts if a limit is lowered.
          </p>
        </div>
      </Section>

      <Section title="Premium Subscription and Payments">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Billing.</strong> Premium is a recurring subscription billed monthly or yearly
              through Stripe. The price, currency and any applicable taxes are shown on the checkout
              page before you confirm.
            </li>
            <li>
              <strong>Renewal and cancellation.</strong> Your plan renews automatically at the end
              of each period until you cancel. Cancel at any time from the Account page ("Manage
              billing"); you keep Premium until the end of the period already paid for and are not
              charged again.
            </li>
            <li>
              <strong>Refunds.</strong> Payments for a period that has started are non-refundable
              except where the law requires otherwise or where we have failed to provide the
              service. If something went wrong, contact{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-saffron hover:text-saffron-dark underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              and we will look at it.
            </li>
            <li>
              <strong>Failed payments.</strong> If a renewal payment fails we will retry it; if it
              continues to fail your account returns to the free plan and ads are shown again. Saved
              charts are kept.
            </li>
            <li>
              <strong>Price changes.</strong> We may change prices for future periods and will
              notify subscribers by email before the change takes effect at their next renewal.
            </li>
            <li>
              <strong>What Premium is.</strong> Premium removes advertising that we serve and raises
              the saved-chart limit. It does not alter the calculations, which remain the same for
              all users and carry the same disclaimers below.
            </li>
          </ul>
        </div>
      </Section>

      <Section title="No Warranty">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The site is provided{" "}
            <strong>"as is" and "as available", without warranties of any kind</strong>, express or
            implied, including but not limited to merchantability, fitness for a particular purpose,
            non-infringement, accuracy, or uninterrupted availability. Use of the site and its
            calculations is entirely <strong>at your own risk</strong>.
          </p>
        </div>
      </Section>

      <Section title="No Guarantee of Accuracy">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            Astronomical and astrological computations are produced by software and may contain
            errors, approximations, or differences from other traditions and ephemerides. Results{" "}
            <strong>must not be relied upon</strong> for medical, legal, financial, religious,
            marital, or any other consequential decisions. Always cross-check with a qualified human
            expert.
          </p>
        </div>
      </Section>

      <Section title="Limitation of Liability">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            To the maximum extent permitted by law, the site, its operators, authors, and
            contributors shall <strong>not be liable</strong> for any direct, indirect, incidental,
            special, consequential, or punitive damages, or any loss of profits, revenues, data,
            goodwill, or other intangible losses, arising out of or in connection with your use of
            the site or its output. Where liability cannot be excluded, it is limited to the amount
            you paid us in the twelve months before the claim.
          </p>
        </div>
      </Section>

      <Section title="Acceptable Use">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              attempt to disrupt, overload, or impair the service (including denial-of-service or
              abusive automated traffic);
            </li>
            <li>circumvent rate limits, security controls, or access restrictions;</li>
            <li>share one account between several people or create accounts by automated means;</li>
            <li>scrape or republish substantial portions of the site without permission;</li>
            <li>use the site for any unlawful purpose or to violate the rights of others.</li>
          </ul>
          <p>We may rate-limit, suspend, or block traffic or accounts that violate these terms.</p>
        </div>
      </Section>

      <Section title="Advertising">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The free plan is supported by advertising. Ads are served by Google AdSense and its
            partners; Premium subscribers are not shown them. We do not endorse and are not
            responsible for the content of third-party advertisements or the products and services
            they promote. See the{" "}
            <a href="/privacy" className="text-saffron hover:text-saffron-dark underline">
              Privacy Policy
            </a>{" "}
            for details on cookies and ad personalization.
          </p>
        </div>
      </Section>

      <Section title="Intellectual Property">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The source code of this project is open source and available on{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-saffron hover:text-saffron-dark underline break-all"
            >
              GitHub
            </a>
            ; consult the repository for license details. The site name, branding, and any non-code
            content remain the property of the site's operators.
          </p>
        </div>
      </Section>

      <Section title="Changes to These Terms">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            We may revise these Terms from time to time. The "Last updated" date at the top reflects
            the most recent revision. Material changes affecting subscribers are also announced by
            email. Continued use of the site after a change constitutes acceptance of the updated
            Terms.
          </p>
        </div>
      </Section>

      <Section title="Contact">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              General:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-saffron hover:text-saffron-dark font-semibold"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              Support:{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-saffron hover:text-saffron-dark font-semibold"
              >
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </Section>
    </div>
  );
}
