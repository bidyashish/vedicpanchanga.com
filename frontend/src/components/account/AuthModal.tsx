import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { useI18n } from "@/i18n";
import { authErrorKey, useAuth, type AuthModalMode } from "@/auth";
import { forgotPassword } from "@/lib/api";
import { renderGoogleButton } from "@/lib/googleIdentity";

type Mode = AuthModalMode | "forgot";

// One global sign-in / sign-up dialog, opened from anywhere via
// useAuth().openAuthModal(). Google button on top (when configured), email +
// password underneath. Errors arrive as backend codes and are localized here.
export function AuthModal() {
  const { t, lang } = useI18n();
  const auth = useAuth();
  const { modal, closeAuthModal, config } = auth;
  const [mode, setMode] = useState<Mode>(modal.mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const googleRef = useRef<HTMLDivElement>(null);

  // Reset form state every time the dialog opens.
  useEffect(() => {
    if (!modal.open) return;
    setMode(modal.mode);
    setPassword("");
    setErrorKey(null);
    setResetSent(false);
    setBusy(false);
  }, [modal.open, modal.mode]);

  // Render Google's button once the dialog (and its container) exists.
  const clientId = config.google_client_id;
  useEffect(() => {
    if (!modal.open || !clientId || mode === "forgot") return;
    const el = googleRef.current;
    if (!el) return;
    let cancelled = false;
    renderGoogleButton(
      el,
      clientId,
      lang,
      async (credential) => {
        if (cancelled) return;
        setBusy(true);
        setErrorKey(null);
        try {
          await auth.signInWithGoogle(credential);
          closeAuthModal();
        } catch (e) {
          setErrorKey(authErrorKey(e));
        } finally {
          setBusy(false);
        }
      },
      Math.min(360, el.clientWidth || 320),
    ).catch(() => setErrorKey("auth_error_google"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.open, clientId, lang, mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      if (mode === "signin") {
        await auth.signIn(email, password);
        closeAuthModal();
      } else if (mode === "signup") {
        await auth.signUp(email, password, name.trim() || undefined);
        closeAuthModal();
      } else {
        await forgotPassword(email);
        setResetSent(true);
      }
    } catch (err) {
      setErrorKey(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "forgot"
      ? t("auth_forgot_title")
      : mode === "signup"
        ? t("auth_modal_title_signup")
        : t("auth_modal_title_signin");

  return (
    <Modal open={modal.open} onClose={closeAuthModal}>
      <div className="w-[min(92vw,26rem)]" data-testid="auth-modal">
        <ModalHeader onClose={closeAuthModal} closeLabel={t("pd_close")}>
          <h2 className="font-serif text-lead text-ink font-semibold">{title}</h2>
        </ModalHeader>

        {modal.reason && mode !== "forgot" && (
          <p className="text-meta text-saffron-dark mb-3">{t(modal.reason)}</p>
        )}
        {mode !== "forgot" && !modal.reason && (
          <p className="text-meta text-ink-soft mb-3">{t("auth_modal_blurb")}</p>
        )}

        {clientId && mode !== "forgot" && (
          <>
            <div ref={googleRef} className="flex justify-center min-h-[44px]" />
            <div className="flex items-center gap-3 my-4 text-mini text-ink-soft">
              <span className="flex-1 h-px bg-parchment-200" />
              {t("auth_or")}
              <span className="flex-1 h-px bg-parchment-200" />
            </div>
          </>
        )}

        {mode === "forgot" && (
          <p className="text-meta text-ink-soft mb-3">{t("auth_forgot_hint")}</p>
        )}

        {resetSent ? (
          <div className="space-y-4">
            <p className="text-meta text-ink border border-sage/40 bg-sage/10 rounded-sm px-3 py-2">
              {t("auth_reset_sent")}
            </p>
            <button type="button" className="btn-ghost w-full" onClick={() => setMode("signin")}>
              {t("auth_back_to_sign_in")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="field-label" htmlFor="auth-name">
                  {t("auth_name")}
                </label>
                <input
                  id="auth-name"
                  className="field"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="auth-email">
                {t("auth_email")}
              </label>
              <input
                id="auth-email"
                data-testid="auth-email"
                className="field"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                dir="ltr"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <label className="field-label" htmlFor="auth-password">
                  {t("auth_password")}
                </label>
                <input
                  id="auth-password"
                  data-testid="auth-password"
                  className="field"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  dir="ltr"
                />
                {mode === "signup" && (
                  <p className="text-mini text-ink-soft mt-1">{t("auth_password_hint")}</p>
                )}
              </div>
            )}

            {errorKey && (
              <div
                role="alert"
                data-testid="auth-error"
                className="border border-rose/40 bg-rose/5 text-rose text-mini px-3 py-2 rounded-sm"
              >
                {t(errorKey)}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={busy}
              data-testid="auth-submit"
            >
              {busy
                ? t("auth_working")
                : mode === "signin"
                  ? t("auth_sign_in")
                  : mode === "signup"
                    ? t("auth_create_account")
                    : t("auth_send_reset")}
            </button>

            <div className="flex flex-wrap justify-between gap-2 text-mini pt-1">
              {mode === "signin" && (
                <>
                  <button
                    type="button"
                    className="text-saffron hover:text-saffron-dark"
                    onClick={() => setMode("signup")}
                  >
                    {t("auth_no_account")} {t("auth_sign_up")}
                  </button>
                  {config.password_reset && (
                    <button
                      type="button"
                      className="text-ink-soft hover:text-ink"
                      onClick={() => setMode("forgot")}
                    >
                      {t("auth_forgot")}
                    </button>
                  )}
                </>
              )}
              {mode === "signup" && (
                <button
                  type="button"
                  className="text-saffron hover:text-saffron-dark"
                  onClick={() => setMode("signin")}
                >
                  {t("auth_have_account")} {t("auth_sign_in")}
                </button>
              )}
              {mode === "forgot" && (
                <button
                  type="button"
                  className="text-saffron hover:text-saffron-dark"
                  onClick={() => setMode("signin")}
                >
                  {t("auth_back_to_sign_in")}
                </button>
              )}
            </div>

            {mode === "signup" && (
              <p className="text-mini text-ink-soft pt-1">
                {t("auth_terms_notice").split("{0}")[0]}
                <a href="/terms" className="underline hover:text-ink">
                  {t("footer_terms")}
                </a>
                {t("auth_terms_notice").split("{0}")[1]?.split("{1}")[0]}
                <a href="/privacy" className="underline hover:text-ink">
                  {t("footer_privacy")}
                </a>
                {t("auth_terms_notice").split("{1}")[1]}
              </p>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
}
