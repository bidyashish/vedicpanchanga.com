import { useEffect } from "react";
import { Section } from "@/components/panchang/Section";
import { SUPPORT_EMAIL, CONTACT_EMAIL } from "@/lib/contact";
import { applySeo } from "@/lib/seo";

const GITHUB_URL = "https://github.com/bidyashish/vedicpanchanga.com";

export function PrivacyPage() {
  useEffect(() => {
    applySeo({
      title: "Privacy Policy · Vedic Panchanga",
      description:
        "Privacy Policy for vedicpanchanga.com - how we handle calculations, optional accounts and saved charts, the session cookie, Stripe payments and Google AdSense advertising.",
      canonical: "https://vedicpanchanga.com/privacy",
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="py-6 space-y-6 max-w-3xl mx-auto">
      <header className="text-center space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-mini text-ink-soft">Last updated: October 2026</p>
        <nav className="pt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-mini">
          <a href="/" className="text-saffron hover:text-saffron-dark">
            Home
          </a>
          <span aria-hidden="true" className="text-ink-soft">
            ·
          </span>
          <a href="/terms" className="text-saffron hover:text-saffron-dark">
            Terms of Use
          </a>
          <span aria-hidden="true" className="text-ink-soft">
            ·
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-saffron hover:text-saffron-dark">
            Contact
          </a>
        </nav>
      </header>

      <Section title="Overview">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            <strong>vedicpanchanga.com</strong> ("we", "our", "the site") is a commercial,
            advertising-supported service that provides Vedic astrological calculations (panchang,
            kundali, muhurta). Every calculator works without an account. An optional free account
            (Google or email) lets you save charts, and an optional paid Premium plan removes
            advertising. This policy explains what information is processed when you use the site
            and how it is handled.
          </p>
          <p>
            By using the site you agree to this Privacy Policy and to the{" "}
            <a href="/terms" className="text-saffron hover:text-saffron-dark underline">
              Terms of Use
            </a>
            .
          </p>
        </div>
      </Section>

      <Section title="Information We Do Not Collect">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            We do not run analytics that profile individual visitors and do not sell, rent, or share
            personal data with data brokers. We never see or store your card number: payments are
            handled entirely by Stripe (see below). We do not send marketing email.
          </p>
        </div>
      </Section>

      <Section title="Information Processed in Your Request">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            Birth date, time, location coordinates, and other inputs you submit are sent to our
            backend solely to compute the requested chart and are returned in the response. They are
            not retained between requests unless you are signed in and explicitly choose{" "}
            <em>Save chart</em> (see "Account Data" below).
          </p>
          <p>
            Standard web request metadata (IP address, user agent, referrer) may appear transiently
            in server logs and in our hosting / CDN provider's logs for security and reliability
            purposes. The IP address is also used, in memory only, to rate-limit sign-in attempts.
          </p>
        </div>
      </Section>

      <Section title="Account Data (Optional)">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>If you create an account, we store the following on our server:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Profile:</strong> your email address, the display name and profile picture
              provided by Google (if you sign in with Google), your Google account identifier, and
              the dates you joined and last signed in.
            </li>
            <li>
              <strong>Password:</strong> if you sign up with email, only a salted scrypt hash of
              your password is stored. We cannot read your password.
            </li>
            <li>
              <strong>Saved charts:</strong> the chart name, birth date and time, coordinates, time
              zone, place name, ayanamsa and any notes you add. Saved charts are visible only to
              your account.
            </li>
            <li>
              <strong>Billing references:</strong> if you subscribe, your Stripe customer and
              subscription identifiers, subscription status and the date your current period ends.
              No card data is stored on our systems.
            </li>
            <li>
              <strong>Password reset tokens:</strong> a hashed, single-use token valid for one hour
              when you request a reset. We send transactional email only for this purpose.
            </li>
          </ul>
          <p>
            This data lives in a database on our server. Encrypted backups of that database are
            written to Cloudflare R2 object storage and automatically expire after about 30 days.
          </p>
          <p>
            <strong>Deleting your account</strong> (Account page, "Delete account") removes your
            profile, saved charts and billing references immediately and cancels any active
            subscription. Copies in expired backups disappear within the backup retention window.
          </p>
        </div>
      </Section>

      <Section title="Information Stored on Your Device">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            Your language and theme preferences are kept in your browser's <code>localStorage</code>{" "}
            for convenience. They never leave your device and are not transmitted to our servers.
          </p>
          <p>
            When you sign in we set one strictly necessary cookie, <code>vp_session</code>, which
            keeps you signed in for up to 30 days. It is marked HttpOnly and Secure and contains
            only a signed account identifier. It is removed when you sign out. No other first-party
            cookies are set.
          </p>
        </div>
      </Section>

      <Section title="Third-Party Services">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>OpenStreetMap Nominatim</strong> - used for city search and reverse geocoding.
              Standard request metadata is processed under their policy.
            </li>
            <li>
              <strong>Cloudflare</strong> - provides TLS, caching, and DDoS protection, and stores
              our encrypted database backups (R2). May process IP and user-agent transiently.
            </li>
            <li>
              <strong>Google Sign-In</strong> - loaded only when the sign-in dialog is open. If you
              choose "Continue with Google", Google shares your verified email, name and picture
              with us under{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:text-saffron-dark underline"
              >
                Google's privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Stripe</strong> - processes Premium payments. Card details are entered on
              Stripe's hosted checkout page and never touch our servers. See{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:text-saffron-dark underline"
              >
                Stripe's privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Google AdSense</strong> - serves advertisements to visitors without a Premium
              plan (see the section below).
            </li>
          </ul>
        </div>
      </Section>

      <Section title="Cookies & Advertising">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            Apart from the session cookie described above we set no cookies of our own. Advertising
            cookies, when present, come from Google and its partners. Premium subscribers are not
            shown ads and the advertising script is not loaded for them.
          </p>
          <p>
            <strong>Google AdSense disclosure.</strong> Third-party vendors, including Google, use
            cookies to serve ads based on a user's previous visits to this site and other sites on
            the Internet. Google's use of advertising cookies enables it and its partners to serve
            ads to users based on their visit to our sites and/or other sites on the Internet.
          </p>
          <p>You can opt out of personalized advertising:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:text-saffron-dark underline"
              >
                Google Ads Settings
              </a>
            </li>
          </ul>
          <p>
            <strong>EEA / UK / Swiss users.</strong> Where required by law, Google's consent
            management tooling will request your consent before serving personalized ads. You may
            withdraw consent at any time via the same tool.
          </p>
          <p>
            For more information on how Google uses data when you use partner sites or apps, see{" "}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="text-saffron hover:text-saffron-dark underline"
            >
              Google's policy
            </a>
            . Most browsers also let you block or delete cookies from their settings.
          </p>
        </div>
      </Section>

      <Section title="Children's Privacy">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            The site is not directed to children under 13 (or under 16 in the EEA / UK) and accounts
            may not be created by them. We do not knowingly collect data from children. If you
            believe a child has provided us with information, please contact us and we will delete
            it.
          </p>
        </div>
      </Section>

      <Section title="Your Rights (GDPR / UK GDPR / CCPA)">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            If you have an account you can see and edit everything we hold about you on the Account
            page, and delete it all yourself at any time with "Delete account". If you would like a
            machine-readable export, or have any other request, write to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-saffron hover:text-saffron-dark font-semibold"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            and we will respond within 30 days.
          </p>
          <p>
            Without an account there is generally nothing on our side to access, correct, or delete.
            For requests related to ad personalization, please use Google's controls linked above.
          </p>
        </div>
      </Section>

      <Section title="Changes to This Policy">
        <div className="space-y-3 text-meta text-ink leading-relaxed">
          <p>
            We may update this policy from time to time. The "Last updated" date at the top reflects
            the most recent revision. Continued use of the site after a change constitutes
            acceptance of the updated policy.
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
            <li>
              Source code &amp; issues:{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron hover:text-saffron-dark font-semibold break-all"
              >
                {GITHUB_URL}
              </a>
            </li>
          </ul>
        </div>
      </Section>
    </div>
  );
}
