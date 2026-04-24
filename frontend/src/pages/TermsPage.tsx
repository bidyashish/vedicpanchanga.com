import { useEffect } from "react";
import { Section } from "@/components/panchang/Section";
import { SUPPORT_EMAIL, CONTACT_EMAIL } from "@/lib/contact";

const GITHUB_URL = "https://github.com/bidyashish/vedicpanchanga.com";

export function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Use · vedicpanchanga.com";
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="py-6 space-y-6 max-w-3xl mx-auto">
      <header className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
          Terms of Use
        </h1>
        <p className="text-mini text-ink-soft">Last updated: April 2026</p>
        <nav className="pt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-mini">
          <a href="/" className="text-saffron hover:text-saffron-dark">Home</a>
          <span aria-hidden="true" className="text-ink-soft">·</span>
          <a href="/privacy" className="text-saffron hover:text-saffron-dark">Privacy Policy</a>
          <span aria-hidden="true" className="text-ink-soft">·</span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-saffron hover:text-saffron-dark"
          >
            Contact
          </a>
        </nav>
      </header>

      <Section title="Acceptance of Terms">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            By accessing or using <strong>vedicpanchanga.com</strong> (the
            "site"), you agree to be bound by these Terms of Use and the{" "}
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
            The site is a commercial, advertising-supported service that
            offers astronomical and astrological calculations including
            panchānga, kuṇḍalī, divisional charts, daśā, and muhūrta search.
            Calculations are produced by software using the Swiss Ephemeris.
          </p>
        </div>
      </Section>

      <Section title="No Warranty">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The site is provided <strong>"as is" and "as available", without
            warranties of any kind</strong>, express or implied, including but
            not limited to merchantability, fitness for a particular purpose,
            non-infringement, accuracy, or uninterrupted availability. Use of
            the site and its calculations is entirely{" "}
            <strong>at your own risk</strong>.
          </p>
        </div>
      </Section>

      <Section title="No Guarantee of Accuracy">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            Astronomical and astrological computations are produced by
            software and may contain errors, approximations, or differences
            from other traditions and ephemerides. Results{" "}
            <strong>must not be relied upon</strong> for medical, legal,
            financial, religious, marital, or any other consequential
            decisions. Always cross-check with a qualified human expert.
          </p>
        </div>
      </Section>

      <Section title="Limitation of Liability">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            To the maximum extent permitted by law, the site, its operators,
            authors, and contributors shall <strong>not be liable</strong> for
            any direct, indirect, incidental, special, consequential, or
            punitive damages, or any loss of profits, revenues, data, goodwill,
            or other intangible losses, arising out of or in connection with
            your use of the site or its output.
          </p>
        </div>
      </Section>

      <Section title="Acceptable Use">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              attempt to disrupt, overload, or impair the service (including
              denial-of-service or abusive automated traffic);
            </li>
            <li>
              circumvent rate limits, security controls, or access restrictions;
            </li>
            <li>
              scrape or republish substantial portions of the site without
              permission;
            </li>
            <li>
              use the site for any unlawful purpose or to violate the rights
              of others.
            </li>
          </ul>
          <p>
            We may rate-limit, suspend, or block traffic that violates these
            terms.
          </p>
        </div>
      </Section>

      <Section title="Advertising">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The site is supported by advertising. Ads are served by Google
            AdSense and its partners. We do not endorse and are not responsible
            for the content of third-party advertisements or the products and
            services they promote. See the{" "}
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
            ; consult the repository for license details. The site name,
            branding, and any non-code content remain the property of the
            site's operators.
          </p>
        </div>
      </Section>

      <Section title="Changes to These Terms">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            We may revise these Terms from time to time. The "Last updated"
            date at the top reflects the most recent revision. Continued use
            of the site after a change constitutes acceptance of the updated
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
