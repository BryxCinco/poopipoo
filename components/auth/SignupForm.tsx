"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, MailCheck, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { format } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";

// Built per language so validation messages follow the app language
const makeSignupSchema = (t: Dictionary["auth"]) =>
  z
    .object({
      username: z
        .string()
        .trim()
        .min(2, t.signup.usernameMin)
        .max(40, t.signup.usernameMax)
        .regex(/^[a-zA-Z0-9._-]+$/, t.signup.usernameChars),
      email: z.string().trim().email(t.invalidEmail),
      password: z.string().min(8, t.signup.passwordMin),
      confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t.signup.passwordMismatch,
      path: ["confirmPassword"],
    });

type SignupValues = z.infer<ReturnType<typeof makeSignupSchema>>;

export function SignupForm({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { t } = useI18n();
  const schema = useMemo(() => makeSignupSchema(t.auth), [t]);

  const form = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async ({ username, email, password }: SignupValues) => {
    setFormError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        // Read by the handle_new_user trigger to fill profiles.username
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnUrl)}`,
      },
    });

    if (error) {
      setFormError(friendlyAuthError(error.message, t.auth.errors));
      return;
    }

    // With email confirmation on, Supabase hides whether the email exists by
    // returning a user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      setFormError(t.auth.errors.alreadyRegistered);
      return;
    }

    if (data.session) {
      // Email confirmation is turned off in Supabase: already signed in.
      toast({ title: t.auth.signup.created, description: format(t.auth.signup.welcome, { username }) });
      router.replace(returnUrl);
      router.refresh();
      return;
    }

    setSentTo(email);
    toast({ title: t.auth.signup.checkEmail, description: t.auth.signup.checkEmailToast });
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6 text-center shadow-sm" role="status">
        <MailCheck className="h-10 w-10 text-primary" aria-hidden="true" />
        <p className="font-semibold">{t.auth.signup.checkEmail}</p>
        <p className="text-sm text-muted-foreground">{format(t.auth.signup.sentTo, { email: sentTo })}</p>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link href={`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`}>{t.auth.signup.backToLogin}</Link>
        </Button>
      </div>
    );
  }

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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.signup.username}</FormLabel>
              <FormControl>
                <Input autoComplete="username" autoCapitalize="none" placeholder={t.auth.signup.usernamePlaceholder} {...field} />
              </FormControl>
              <FormDescription>{t.auth.signup.usernameHint}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.signup.confirmPassword}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
          {submitting ? t.auth.signup.submitting : t.auth.signup.submit}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t.auth.signup.haveAccount}{" "}
          <Link
            href={`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {t.auth.signup.loginLink}
          </Link>
        </p>
      </form>
    </Form>
  );
}
