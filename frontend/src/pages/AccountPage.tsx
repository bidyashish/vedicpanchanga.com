import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Section } from "@/components/panchang/Section";
import { SavedChartList } from "@/components/account/SavedChartList";
import { useI18n } from "@/i18n";
import { authErrorKey, useAuth } from "@/auth";
import { useSavedCharts } from "@/auth/savedCharts";
import { changePassword, openBillingPortal, resetPassword, startCheckout } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { readSearch, round4, shareUrlFor } from "@/lib/urlState";
import type { SavedChart } from "@/types/api";

function openSavedChart(c: SavedChart) {
  window.location.assign(
    shareUrlFor("/kundali", {
      name: c.name || undefined,
      birth_date: c.birth_date,
      birth_time: c.birth_time,
      lat: round4(c.latitude),
      lon: round4(c.longitude),
      tz: c.timezone || undefined,
      place: c.place_name || undefined,
      ayanamsa: c.ayanamsa === "lahiri" ? undefined : c.ayanamsa,
    }),
  );
}

export function AccountPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const { user, config, status, enabled, openAuthModal, refresh, setUser } = auth;
  const saved = useSavedCharts();

  // One-shot query params: Stripe redirect outcome and password-reset token.
  const params = useMemo(() => {
    const sp = readSearch();
    return { checkout: sp.get("checkout"), reset: sp.get("reset") };
  }, []);
  useEffect(() => {
    if (params.checkout || params.reset) {
      window.history.replaceState(null, "", "/account");
    }
    if (params.checkout === "success") refresh();
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [params, refresh]);

  const [notice, setNotice] = useState<string | null>(
    params.checkout === "success"
      ? "acct_checkout_success"
      : params.checkout === "cancel"
        ? "acct_checkout_cancel"
        : null,
  );
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ── password reset (token from email) ────────────────────────────────
  const [resetPw, setResetPw] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(params.reset);
  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetToken) return;
    setBusy("reset");
    setErrorKey(null);
    try {
      const { user: u } = await resetPassword(resetToken, resetPw);
      setUser(u);
      setResetToken(null);
      setNotice("acct_password_changed");
    } catch (err) {
      setErrorKey(authErrorKey(err));
    } finally {
      setBusy(null);
    }
  };

  // ── change / set password ────────────────────────────────────────────
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("password");
    setErrorKey(null);
    try {
      const { user: u } = await changePassword(user?.has_password ? curPw : null, newPw);
      setUser(u);
      setCurPw("");
      setNewPw("");
      setNotice("acct_password_changed");
    } catch (err) {
      setErrorKey(authErrorKey(err));
    } finally {
      setBusy(null);
    }
  };

  // ── billing ──────────────────────────────────────────────────────────
  const onCheckout = async (plan: "monthly" | "yearly") => {
    setBusy(plan);
    setErrorKey(null);
    try {
      const { url } = await startCheckout(plan);
      window.location.assign(url);
    } catch (err) {
      setErrorKey(authErrorKey(err));
      setBusy(null);
    }
  };
  const onPortal = async () => {
    setBusy("portal");
    setErrorKey(null);
    try {
      const { url } = await openBillingPortal();
      window.location.assign(url);
    } catch (err) {
      setErrorKey(authErrorKey(err));
      setBusy(null);
    }
  };

  const onDelete = async () => {
    if (!window.confirm(t("acct_delete_prompt"))) return;
    setBusy("delete");
    try {
      await auth.deleteAccount();
      window.location.assign("/");
    } catch (err) {
      setErrorKey(authErrorKey(err));
      setBusy(null);
    }
  };

  if (status === "loading") return null;

  const header = (
    <header className="text-center space-y-1">
      <h1 className="font-serif text-2xl sm:text-3xl text-ink font-semibold tracking-tight">
        {t("acct_title")}
      </h1>
      <p className="text-meta text-ink-soft">{t("acct_subtitle")}</p>
    </header>
  );

  const alerts = (
    <>
      {notice && (
        <p
          data-testid="account-notice"
          className="text-meta text-ink border border-sage/40 bg-sage/10 rounded-sm px-3 py-2"
        >
          {t(notice)}
        </p>
      )}
      {errorKey && (
        <p
          role="alert"
          className="border border-rose/40 bg-rose/5 text-rose text-mini px-3 py-2 rounded-sm"
        >
          {t(errorKey)}
        </p>
      )}
    </>
  );

  if (!enabled) {
    return (
      <div className="py-6 space-y-6 max-w-3xl mx-auto">
        {header}
        <p className="text-meta text-ink-soft text-center">{t("auth_error_disabled")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-6 space-y-6 max-w-3xl mx-auto" data-testid="account-page">
        {header}
        {alerts}
        {resetToken ? (
          <Section title={t("auth_reset_title")}>
            <form onSubmit={onReset} className="space-y-3 max-w-sm">
              <div>
                <label className="field-label" htmlFor="reset-password">
                  {t("auth_new_password")}
                </label>
                <input
                  id="reset-password"
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                />
                <p className="text-mini text-ink-soft mt-1">{t("auth_password_hint")}</p>
              </div>
              <button type="submit" className="btn-primary" disabled={busy === "reset"}>
                {busy === "reset" ? t("auth_working") : t("auth_set_password")}
              </button>
            </form>
          </Section>
        ) : (
          <div className="card p-6 text-center space-y-4">
            <p className="text-meta text-ink">{t("acct_signin_prompt")}</p>
            <div className="flex justify-center gap-3">
              <button type="button" className="btn-primary" onClick={() => openAuthModal("signin")}>
                {t("auth_sign_in")}
              </button>
              <button type="button" className="btn-ghost" onClick={() => openAuthModal("signup")}>
                {t("auth_sign_up")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const premium = user.is_premium;
  const periodEnd = user.premium_until ? formatShortDate(user.premium_until.slice(0, 10)) : null;

  return (
    <div className="py-6 space-y-6 max-w-3xl mx-auto" data-testid="account-page">
      {header}
      {alerts}

      <Section title={t("acct_signed_in_as")}>
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-full border overflow-hidden flex items-center justify-center bg-parchment-100 ${premium ? "border-saffron" : "border-parchment-200"}`}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-serif text-xl text-ink">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-lead text-ink font-semibold truncate">
              {user.name || user.email}
            </div>
            <div className="text-meta text-ink-soft truncate" dir="ltr">
              {user.email}
            </div>
            <div className="text-mini text-ink-soft">
              {user.provider === "google" ? t("acct_provider_google") : t("acct_provider_email")} ·{" "}
              {t("acct_member_since").replace("{0}", formatShortDate(user.created_at.slice(0, 10)))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title={t("acct_plan")}
        subtitle={premium ? t("acct_premium_badge") : undefined}
        testId="account-plan"
      >
        <div className="space-y-3">
          <p className="text-meta text-ink">
            <strong>{premium ? t("acct_plan_premium") : t("acct_plan_free")}</strong>
            {" - "}
            {(premium ? t("acct_premium_desc") : t("acct_free_desc")).replace(
              "{0}",
              String(user.chart_limit),
            )}
          </p>
          {premium && periodEnd && (
            <p className="text-mini text-ink-soft">
              {user.subscription_status === "past_due"
                ? t("acct_subscription_status_past_due")
                : user.cancel_at_period_end || user.subscription_status === "canceled"
                  ? t("acct_cancels").replace("{0}", periodEnd)
                  : t("acct_renews").replace("{0}", periodEnd)}
            </p>
          )}
          {config.billing ? (
            premium && user.has_billing ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={onPortal}
                disabled={busy === "portal"}
                data-testid="billing-portal"
              >
                {busy === "portal" ? t("auth_working") : t("acct_manage_billing")}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-meta text-ink-soft">{t("acct_upgrade_hint")}</p>
                <div className="flex flex-wrap gap-2">
                  {config.plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`checkout-${p.id}`}
                      className={p.id === "yearly" ? "btn-primary" : "btn-ghost"}
                      disabled={busy === p.id}
                      onClick={() => onCheckout(p.id)}
                    >
                      {busy === p.id
                        ? t("auth_working")
                        : `${t("acct_upgrade")} · ${t(p.id === "monthly" ? "acct_plan_monthly" : "acct_plan_yearly")}`}
                    </button>
                  ))}
                </div>
                {user.has_billing && (
                  <button
                    type="button"
                    className="text-mini text-ink-soft hover:text-ink underline"
                    onClick={onPortal}
                  >
                    {t("acct_manage_billing")}
                  </button>
                )}
              </div>
            )
          ) : (
            <p className="text-mini text-ink-soft">{t("acct_billing_unavailable")}</p>
          )}
        </div>
      </Section>

      <Section title={t("saved_title")} testId="account-saved">
        <SavedChartList
          charts={saved.charts}
          limit={saved.limit}
          loading={saved.loading}
          onOpen={openSavedChart}
          onDelete={(c) => saved.remove(c.id).catch((e) => setErrorKey(authErrorKey(e)))}
        />
      </Section>

      <Section title={t("acct_security")}>
        <form onSubmit={onChangePassword} className="space-y-3 max-w-sm">
          {!user.has_password && (
            <p className="text-meta text-ink-soft">{t("acct_set_password_hint")}</p>
          )}
          {user.has_password && (
            <div>
              <label className="field-label" htmlFor="cur-password">
                {t("acct_current_password")}
              </label>
              <input
                id="cur-password"
                className="field"
                type="password"
                required
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                autoComplete="current-password"
                dir="ltr"
              />
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="new-password">
              {t("auth_new_password")}
            </label>
            <input
              id="new-password"
              className="field"
              type="password"
              required
              minLength={8}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
            />
            <p className="text-mini text-ink-soft mt-1">{t("auth_password_hint")}</p>
          </div>
          <button type="submit" className="btn-ghost" disabled={busy === "password"}>
            {busy === "password"
              ? t("auth_working")
              : user.has_password
                ? t("acct_change_password")
                : t("auth_set_password")}
          </button>
        </form>
      </Section>

      <Section title={t("acct_danger")}>
        <div className="space-y-3">
          <p className="text-meta text-ink-soft">{t("acct_delete_hint")}</p>
          <button
            type="button"
            data-testid="delete-account"
            onClick={onDelete}
            disabled={busy === "delete"}
            className="inline-flex items-center px-3 py-1.5 rounded-sm border border-rose/50 text-rose text-meta font-medium hover:bg-rose/5 transition-colors disabled:opacity-50"
          >
            {busy === "delete" ? t("auth_working") : t("acct_delete_confirm")}
          </button>
        </div>
      </Section>
    </div>
  );
}
