"use client";

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";

const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(2, "Hindi bababa sa 2 letra.")
      .max(40, "Hanggang 40 letra lang.")
      .regex(/^[a-zA-Z0-9._-]+$/, "Letra, numero, at . _ - lang ang pwede."),
    email: z.string().trim().email("Maglagay ng tamang email."),
    password: z.string().min(8, "Hindi bababa sa 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Hindi magkapareho ang password.",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm({ returnUrl }: { returnUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
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
      setFormError(friendlyAuthError(error.message));
      return;
    }

    // With email confirmation on, Supabase hides whether the email exists by
    // returning a user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      setFormError("May account na ang email na ito. Mag-login na lang.");
      return;
    }

    if (data.session) {
      // Email confirmation is turned off in Supabase: already signed in.
      toast({ title: "Nagawa ang account mo!", description: `Welcome, ${username}!` });
      router.replace(returnUrl);
      router.refresh();
      return;
    }

    setSentTo(email);
    toast({ title: "I-check ang email mo", description: "Nag-send kami ng confirmation link." });
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center" role="status">
        <MailCheck className="h-10 w-10 text-[#8B4513]" aria-hidden="true" />
        <p className="font-semibold">I-check ang email mo</p>
        <p className="text-sm text-muted-foreground">
          Nag-send kami ng confirmation link sa <span className="font-medium text-foreground">{sentTo}</span>.
          I-click ito para ma-activate ang account mo.
        </p>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link href={`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`}>Bumalik sa login</Link>
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
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input autoComplete="username" autoCapitalize="none" placeholder="juan.delacruz" {...field} />
              </FormControl>
              <FormDescription>Ito ang makikita ng iba.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" placeholder="ikaw@email.com" {...field} />
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
              <FormLabel>Password</FormLabel>
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
              <FormLabel>Ulitin ang password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
          {submitting ? "Ginagawa ang account..." : "Mag-sign up"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          May account na?{" "}
          <Link
            href={`/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Mag-login
          </Link>
        </p>
      </form>
    </Form>
  );
}
