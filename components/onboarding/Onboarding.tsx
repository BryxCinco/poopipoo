"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, MessageSquarePlus, Sparkles, Toilet, type LucideIcon } from "lucide-react";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Modal } from "@/components/ui/Modal";
import { stepSlide } from "@/lib/animations";
import { cn } from "@/lib/utils";

/**
 * First-visit intro: 4 short slides in a modal. Once finished or skipped
 * (Skip, Escape, or tapping outside) it's saved in localStorage and never
 * shown again on this device. Clearing local data (Settings) shows it again.
 */

export const ONBOARDING_KEY = "poopipoo:onboarding-done";

interface Slide {
  icon: LucideIcon;
  title: string;
  description: string;
}

const SLIDES: readonly Slide[] = [
  {
    icon: Toilet,
    title: "Hanapin ang pinakamalapit na CR",
    description: "Ang Poopipoo ang \"Waze ng CR\" sa Pilipinas. Makikita mo sa mapa ang mga CR na malapit sa'yo.",
  },
  {
    icon: MapPin,
    title: "I-tap ang pin para sa detalye",
    description: "Makikita mo ang rating, amenities (bidet, tissue, PWD), at pwede kang magpa-direksyon papunta roon.",
  },
  {
    icon: MessageSquarePlus,
    title: "Mag-add ng CR, mag-review",
    description: "Tulungan ang iba: magdagdag ng CR at mag-iwan ng review. May points at badges ka pa!",
  },
  {
    icon: Sparkles,
    title: "Tanungin ang AI agent",
    description: "I-tap ang sparkle button sa mapa at itanong, halimbawa: \"May malinis bang CR na may bidet sa BGC?\"",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

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

  const last = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  const Icon = slide.icon;

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
            <AnimatedButton type="button" variant="ghost" size="lg" onClick={finish} aria-label="Laktawan ang intro" className="w-full sm:w-auto">
              Skip
            </AnimatedButton>
          )}
          <AnimatedButton
            type="button"
            size="lg"
            onClick={() => (last ? finish() : go(step + 1))}
            aria-label={last ? "Simulan ang paggamit ng Poopipoo" : "Susunod na slide"}
            className="w-full sm:w-auto"
          >
            {last ? "Simulan na" : "Next"}
            <ArrowRight aria-hidden="true" />
          </AnimatedButton>
        </>
      }
    >
      {/* Progress dots (also buttons, to jump to a slide) */}
      <div className="flex items-center justify-center gap-2">
        {SLIDES.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => go(index)}
            aria-label={`Slide ${index + 1} ng ${SLIDES.length}`}
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
    </Modal>
  );
}
