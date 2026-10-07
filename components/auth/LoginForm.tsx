"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/auth/errors";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";

// Built per language so validation messages follow the app language
const makeLoginSchema = (t: Dictionary["auth"]) =>
  z.object({
    email: z.string().trim().email(t.invalidEmail),
    password: z.string().min(1, t.passwordRequired),
  });

type LoginValues = z.infer<ReturnType<typeof makeLoginSchema>>;

/** Errors passed in the URL (?error=...) */
export type LoginUrlError = "confirm";

interface LoginFormProps {
  returnUrl: string;
  /** Error passed in the URL (e.g. failed email confirmation). */
  initialError?: LoginUrlError | null;
}

export function LoginForm({ returnUrl, initialError = null }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(
    initialError === "confirm" ? t.auth.login.confirmError : null
  );
  const schema = useMemo(() => makeLoginSchema(t.auth), [t]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) {
      setFormError(friendlyAuthError(error.message, t.auth.errors));
      return;
    }
    toast({ title: t.auth.login.success, description: t.auth.login.successDescription });
    router.replace(returnUrl);
    // Re-render Server Components with the new session cookies
    router.refresh();
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {formError}
          </p>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.email}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" placeholder={t.auth.emailPlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.password}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
          {submitting ? t.auth.login.submitting : t.auth.login.submit}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t.auth.login.noAccount}{" "}
          <Link
            href={`/auth/signup?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t.auth.login.signupLink}
          </Link>
        </p>
      </form>
    </Form>
  );
}
