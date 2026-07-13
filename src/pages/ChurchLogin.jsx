import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Church as ChurchIcon, Mail, Lock, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export default function ChurchLogin() {
  const { subdomain } = useParams();
  const [church, setChurch] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Remember which church's login page was used so the account gets linked to it.
    if (subdomain) localStorage.setItem('pending_church_subdomain', subdomain);
    (async () => {
      try {
        const results = await base44.entities.Church.filter({ subdomain });
        setChurch(results[0] || null);
      } catch (e) {
        setChurch(null);
      }
      setLoadingChurch(false);
    })();
  }, [subdomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      try { await base44.functions.invoke('linkUserToChurch', { subdomain }); } catch (e) { /* linked later */ }
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (loadingChurch) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <ChurchIcon className="w-10 h-10 text-slate-300 mb-3" />
        <h1 className="text-lg font-semibold text-slate-700">Church not found</h1>
        <p className="text-sm text-slate-500 mt-1">We couldn't find a church at this link.</p>
        <Link to="/login" className="text-sm text-indigo-600 hover:underline mt-4">Go to standard login</Link>
      </div>
    );
  }

  const color = church.branding_color || "#4f46e5";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6 text-center">
          {church.logo_url ? (
            <img src={church.logo_url} alt={`${church.name} logo`} className="h-20 w-20 object-contain rounded-xl mb-3" />
          ) : (
            <div className="h-16 w-16 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color }}>
              <ChurchIcon className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-900">{church.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Log in to your account</p>
        </div>

        <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle}>
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400">or</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs hover:underline" style={{ color }}>Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium text-white hover:opacity-90" style={{ backgroundColor: color }} disabled={loading}>
            {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</>) : ("Log in")}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="font-medium hover:underline" style={{ color }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}