"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Shield } from "lucide-react";
import { getStoredToken, login } from "@/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await login({ email, password });
      console.log("[login] response", data);
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <section className="hidden lg:flex lg:w-1/2 login-gradient relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border border-primary-foreground/20" />
          <div className="absolute bottom-32 right-16 w-96 h-96 rounded-full border border-primary-foreground/10" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-primary-foreground/15" />
        </div>

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-amber-900" />
            </div>
            <h1 className="text-2xl font-bold text-white">InterviewIQ</h1>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Standardise your interviews.
            <br />
            Hire with confidence.
          </h2>
          <p className="text-white/65 text-lg leading-relaxed">
            Upload candidate profiles, get AI-driven question sets, and ensure
            every interview is fair, consistent, and insightful.
          </p>
        </div>
      </section>

      {/* Right Panel — Form */}
      <section className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-sm slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">InterviewIQ</span>
          </div>

          <header className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white border-gray-300 focus:border-indigo-500 rounded-lg shadow-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white text-gray-900 placeholder:text-gray-400 border-gray-300 focus:border-indigo-500 rounded-lg shadow-sm pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {errorMessage ? (
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            ) : null}
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/register")}
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              Request access
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
