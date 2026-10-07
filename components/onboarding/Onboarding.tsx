"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, MessageSquarePlus, Sparkles, Toilet, type LucideIcon } from "lucide-react";

import { LanguageSwitch } from "@/components/i18n/LanguageSwitch";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/hooks/use-i18n";
import { stepSlide } from "@/lib/animations";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/**
 * First-visit intro: 4 short slides in a modal. Once finished or skipped
 * (Skip, Escape, or tapping outside) it's saved in localStorage and never
 * shown again on this device. Clearing local data (Settings) shows it again.
 */

export const ONBOARDING_KEY = "poopipoo:onboarding-done";

// Icons per slide; the text is in t.onboarding.slides (same order)
const SLIDE_ICONS: readonly LucideIcon[] = [Toilet, MapPin, MessageSquarePlus, Sparkles];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const { t } = useI18n();
  const slides = t.onboarding.slides;

  // Only check after mount: localStorage doesn't exist during the server render
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ONBOARDING_KEY) !== "1") setOpen(true);
    } catch {
      // storage blocked: don't show it (it would come back on every visit)
    }
  }, []);

  const finish = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // storage blocked: nothing to remember
    }
  };

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const last = step === slides.length - 1;
  const slide = slides[step];
  const Icon = SLIDE_ICONS[step];

  // Each slide's content re-mounts (key) and slides in from the direction of travel
  const animated = (content: string) => (
    <motion.span key={step} custom={direction} variants={stepSlide} initial="hidden" animate="visible" className="block">
      {content}
    </motion.span>
  );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) finish();
      }}
      hideCloseButton
      // The sliding text must not cause a horizontal scrollbar mid-animation
      className="overflow-x-hidden"
      icon={
        <motion.span
          key={step}
          initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-8 ring-primary/10"
        >
          <Icon className="h-8 w-8" aria-hidden="true" />
        </motion.span>
      }
      title={animated(slide.title)}
      description={animated(slide.description)}
      footer={
        <>
          {!last && (
            <AnimatedButton type="button" variant="ghost" size="lg" onClick={finish} aria-label={t.onboarding.skipLabel} className="w-full sm:w-auto">
              {t.onboarding.skip}
            </AnimatedButton>
          )}
          <AnimatedButton
            type="button"
            size="lg"
            onClick={() => (last ? finish() : go(step + 1))}
            aria-label={last ? t.onboarding.startLabel : t.onboarding.nextLabel}
            className="w-full sm:w-auto"
          >
            {last ? t.onboarding.start : t.onboarding.next}
            <ArrowRight aria-hidden="true" />
          </AnimatedButton>
        </>
      }
    >
      {/* Progress dots (also buttons, to jump to a slide) */}
      <div className="flex items-center justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => go(index)}
            aria-label={format(t.onboarding.slideLabel, { current: index + 1, total: slides.length })}
            aria-current={index === step ? "step" : undefined}
            className="flex h-6 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                index === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>

      {/* First slide: pick the language (the default follows the browser) */}
      {step === 0 && (
        <div className="flex flex-col gap-1.5">
          <span id="onboarding-language" className="text-center text-xs font-medium text-muted-foreground">
            {t.onboarding.language}
          </span>
          <LanguageSwitch labelledBy="onboarding-language" />
        </div>
      )}
    </Modal>
  );
}
