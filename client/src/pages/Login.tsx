import { FormEvent, useState } from "react";
import { ArrowUpLeft, LogIn, UserPlus } from "lucide-react";
import { Link, useLocation } from "wouter";
import SiteLayout from "../components/SiteLayout";
import { trpc } from "../lib/trpc";
import { useTheme } from "../contexts/ThemeContext";

export default function Login() {
  const { language } = useTheme();
  const ar = language === "ar";
  const fr = language === "fr";
  const tx = (arabic: string, english: string, french: string) => ar ? arabic : fr ? french : english;
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.login.useMutation({ onSuccess: () => navigate("/dashboard"), onError: e => setError(friendlyError(e.message)) });
  const signup = trpc.auth.signup.useMutation({ onSuccess: () => navigate("/dashboard"), onError: e => setError(friendlyError(e.message)) });
  const pending = login.isPending || signup.isPending;
  const friendlyError = (message: string) => {
    if (message.includes("already exists")) return tx("هذا البريد الإلكتروني مستخدم بالفعل.", "This email is already registered.", "Cet e-mail est déjà utilisé.");
    if (message.includes("incorrect") || message.includes("Invalid email")) return tx("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "The email or password is incorrect.", "L’e-mail ou le mot de passe est incorrect.");
    if (message.includes("temporarily unavailable") || message.includes("DATABASE") || message.includes("Database setup is incomplete")) return tx("الخدمة غير متاحة مؤقتاً. تأكد من إعداد قاعدة البيانات.", "The service is temporarily unavailable. Check the database configuration.", "Le service est temporairement indisponible. Vérifiez la base de données.");
    return message;
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "signup") signup.mutate({ name, email, password });
    else login.mutate({ email, password });
  };
  const isLogin = mode === "login";
  return (
    <SiteLayout>
      <div className="auth-page page-container">
        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-icon" aria-hidden="true">{isLogin ? <LogIn /> : <UserPlus />}</span>
            <p className="kicker">QYLAKI</p>
            <h1>{isLogin ? tx("مرحباً بعودتك", "Welcome back", "Bon retour") : tx("أنشئ حسابك", "Create your account", "Créer votre compte")}</h1>
            <p>{isLogin ? tx("سجّل الدخول لمتابعة مشاريعك وطلباتك.", "Sign in to follow your projects and requests.", "Connectez-vous pour suivre vos projets et demandes.") : tx("أنشئ حساباً لحفظ طلباتك ومتابعة تقدمها.", "Create an account to save and follow your requests.", "Créez un compte pour enregistrer et suivre vos demandes.")}</p>
          </div>
          <form onSubmit={submit} className="auth-form">
            {!isLogin && <label>{tx("الاسم", "Name", "Nom")}<input value={name} onChange={event => setName(event.target.value)} required minLength={2} autoComplete="name" /></label>}
            <label>{tx("البريد الإلكتروني", "Email", "E-mail")}<input value={email} onChange={event => setEmail(event.target.value)} type="email" required autoComplete="email" /></label>
            <label>{tx("كلمة المرور", "Password", "Mot de passe")}<input value={password} onChange={event => setPassword(event.target.value)} type="password" required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} /><small>{tx("8 أحرف على الأقل", "At least 8 characters", "8 caractères minimum")}</small></label>
            {error && <div className="form-error-banner" role="alert">{error}</div>}
            <button className="button primary" disabled={pending} type="submit">
              {pending ? tx("جارٍ التنفيذ...", "Working...", "Traitement...") : isLogin ? <><LogIn size={16} />{tx("تسجيل الدخول", "Sign in", "Se connecter")}</> : <><UserPlus size={16} />{tx("إنشاء الحساب", "Create account", "Créer le compte")}</>}
            </button>
          </form>
          <button className="auth-switch" type="button" onClick={() => { setMode(isLogin ? "signup" : "login"); setError(""); }}>
            {isLogin ? tx("ليس لديك حساب؟ أنشئ حساباً", "Need an account? Create one", "Pas encore de compte ? Créez-en un") : tx("لديك حساب؟ سجّل الدخول", "Already have an account? Sign in", "Déjà un compte ? Connectez-vous")}
          </button>
          <Link className="auth-back" href="/"><ArrowUpLeft size={15} />{tx("العودة للرئيسية", "Back home", "Retour à l’accueil")}</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
