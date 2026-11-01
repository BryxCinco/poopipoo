"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDollarSign,
  Crosshair,
  Loader2,
  MapPin,
  Pencil,
  Wand2,
  X,
} from "lucide-react";

import type { MapTarget } from "@/components/map/MapController";
import type { LatLng } from "@/components/map/LocationPicker";
import { MiniMapLoader } from "@/components/map/MiniMapLoader";
import { RateLimitNotice } from "@/components/moderation/Notices";
import { ImageUploader, type PendingPhoto } from "@/components/restroom/ImageUploader";
import { AmenityBadge, PriceBadge } from "@/components/restroom/RestroomBadges";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AnimatedCheck } from "@/components/ui/AnimatedCheck";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { DURATION, EASE_OUT, scaleIn, SPRING, stepSlide, tapScale } from "@/lib/animations";
import { isDemoUser } from "@/lib/auth/demo";
import { reverseGeocode } from "@/lib/geocode";
import { errorText } from "@/lib/i18n/errors";
import { format } from "@/lib/i18n/format";
import { RateLimitError } from "@/lib/moderation/errors";
import { addRestroom } from "@/lib/restroom-store";
import { isInPhotoArea, removeRestroomPhotos, uploadRestroomPhotos, type UploadedPhotos } from "@/lib/restroom-photos";
import { createClient } from "@/lib/supabase/client";
import { ALL_AMENITIES, getAmenityIcon, getDisplayAmenities } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { Amenity } from "@/types/restroom";

// Leaflet needs `window`, so the picker only loads in the browser.
const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

// ---------- form model ----------

// Step names are in t.add.steps (same order)
const STEP_COUNT = 4;
const LAST_STEP = STEP_COUNT - 1;

const LIMITS = { name: { min: 3, max: 80 }, address: { min: 5, max: 200 }, description: 500 };

// How long the "Naidagdag!" success check stays before opening the new restroom
const SUCCESS_HOLD_MS = 900;

// "free" is chosen with the Libre / May bayad toggle instead of a checkbox.
const AMENITY_OPTIONS = getDisplayAmenities(ALL_AMENITIES);

interface FormState {
  location: LatLng | null;
  name: string;
  description: string;
  address: string;
  amenities: Amenity[];
  isFree: boolean;
}

// Which fields are invalid; the message (in the current language) comes from t.add.errors
type FieldErrors = Partial<Record<"location" | "name" | "address", true>>;

const INITIAL_STATE: FormState = {
  location: null,
  name: "",
  description: "",
  address: "",
  amenities: [],
  isFree: true,
};

/** Errors for the fields shown on a given step (only steps 0 and 1 have required fields). */
function validateStep(step: number, form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0 && !form.location) errors.location = true;
  if (step === 1) {
    if (form.name.trim().length < LIMITS.name.min) errors.name = true;
    if (form.address.trim().length < LIMITS.address.min) errors.address = true;
  }
  return errors;
}

const locationKey = ({ latitude, longitude }: LatLng) =>
  `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

const formatCoords = ({ latitude, longitude }: LatLng) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

// ---------- component ----------

interface AddRestroomFormProps {
  /** Signed-in user's id (the page redirects guests to login). */
  userId: string;
}

export function AddRestroomForm({ userId }: AddRestroomFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const geolocation = useGeolocation();
  const { t } = useI18n();
  const ta = t.add;
  const errorMessage = {
    location: ta.errors.location,
    name: format(ta.errors.name, { min: LIMITS.name.min }),
    address: format(ta.errors.address, { min: LIMITS.address.min }),
  };

  const [step, setStepState] = useState(0);
  // +1 = forward, -1 = back: steps slide in from the matching side
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  // Bumped on every failed "Susunod" so error messages re-mount and shake again
  const [errorAttempt, setErrorAttempt] = useState(0);
  const [focus, setFocus] = useState<MapTarget | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  // Set when saving hit the rate limit: shows a countdown, submit waits for it
  const [rateLimitedUntil, setRateLimitedUntil] = useState<string | null>(null);
  const clearRateLimit = useCallback(() => setRateLimitedUntil(null), []);

  // Photos (optional): compressed on pick, uploaded on submit (lib/restroom-photos.ts)
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const { user } = useAuthUser();
  const photosOffReason = isDemoUser(user)
    ? ta.photosDemo
    : form.location && !isInPhotoArea(form.location.latitude, form.location.longitude)
      ? ta.photosOutsideArea
      : null;
  // Previews are object URLs: free them when leaving the page
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl)), []);

  const setStep = (next: number) => {
    setDirection(next >= step ? 1 : -1);
    setStepState(next);
  };

  // Address auto-fill bookkeeping
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);
  const lastAutoAddress = useRef<string | null>(null);
  const lastGeocodedKey = useRef<string | null>(null);
  const geocodeAbort = useRef<AbortController | null>(null);

  useEffect(() => () => geocodeAbort.current?.abort(), []);

  const isDirty =
    form.location !== null ||
    form.name !== "" ||
    form.description !== "" ||
    form.address !== "" ||
    form.amenities.length > 0 ||
    photos.length > 0;

  // "May hindi ka pa na-save." when leaving via a link (not after saving)
  useUnsavedChanges("add-restroom", isDirty && !submitting && !saved);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear a field's error as soon as the user fixes it.
    setErrors((prev) => (key in prev ? { ...prev, [key]: undefined } : prev));
  };

  const handleLocationChange = useCallback((location: LatLng) => {
    setForm((prev) => ({ ...prev, location }));
    setErrors((prev) => ({ ...prev, location: undefined }));
  }, []);

  const handleUseMyLocation = async () => {
    const result = await geolocation.requestLocation();
    if (result.error) {
      toast({ variant: "destructive", title: ta.locationError, description: result.error });
      return;
    }
    handleLocationChange({ latitude: result.latitude, longitude: result.longitude });
    setFocus({ latitude: result.latitude, longitude: result.longitude, zoom: 18 });
  };

  const fillAddressFromPin = async (location: LatLng) => {
    geocodeAbort.current?.abort();
    const controller = new AbortController();
    geocodeAbort.current = controller;

    setGeocoding(true);
    setGeocodeFailed(false);
    const address = await reverseGeocode(location.latitude, location.longitude, controller.signal);
    if (controller.signal.aborted) return;

    setGeocoding(false);
    lastGeocodedKey.current = locationKey(location);
    if (address) {
      lastAutoAddress.current = address.slice(0, LIMITS.address.max);
      update("address", lastAutoAddress.current);
    } else {
      setGeocodeFailed(true);
    }
  };

  const goNext = () => {
    const stepErrors = validateStep(step, form);
    if (Object.values(stepErrors).some(Boolean)) {
      setErrors(stepErrors);
      setErrorAttempt((n) => n + 1);
      return;
    }
    setErrors({});

    // Leaving the map step: auto-fill the address if the user hasn't typed their own
    // and the pin moved since the last lookup.
    if (step === 0 && form.location) {
      const addressUntouched = form.address === "" || form.address === lastAutoAddress.current;
      if (addressUntouched && lastGeocodedKey.current !== locationKey(form.location)) {
        void fillAddressFromPin(form.location);
      }
    }
    setStep(Math.min(step + 1, LAST_STEP));
  };

  const goBack = () => {
    if (step > 0) {
      setErrors({});
      setStep(step - 1);
    } else {
      handleCancel();
    }
  };

  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  const handleCancel = () => (isDirty ? setConfirmCancel(true) : leave());

  const handleSubmit = async () => {
    if (submitting || rateLimitedUntil) return;
    // Re-check everything in case a step was skipped via "I-edit" links.
    for (const s of [0, 1]) {
      const stepErrors = validateStep(s, form);
      if (Object.values(stepErrors).some(Boolean)) {
        setErrors(stepErrors);
        setErrorAttempt((n) => n + 1);
        setStep(s);
        return;
      }
    }
    if (!form.location) return;

    setSubmitting(true);
    // Photos picked earlier are dropped if the pin moved outside the photo area since
    const photoFiles = photosOffReason ? [] : photos.map((photo) => photo.file);
    let uploaded: UploadedPhotos | null = null;
    try {
      if (photoFiles.length > 0) {
        setUploadProgress({ done: 0, total: photoFiles.length });
        uploaded = await uploadRestroomPhotos(createClient(), userId, photoFiles, (done, total) =>
          setUploadProgress({ done, total })
        );
      }
      const restroom = await addRestroom(
        {
          name: form.name,
          description: form.description,
          address: form.address,
          latitude: form.location.latitude,
          longitude: form.location.longitude,
          amenities: form.amenities,
          images: uploaded?.urls ?? [],
          isFree: form.isFree,
        },
        userId
      );
      setUploadProgress(null);
      // AI moderation runs on the server in the background (Groq). Not awaited:
      // the result only matters to moderators. keepalive lets it finish even
      // if the page changes right away.
      void fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restroom_id: restroom.id }),
        keepalive: true,
      }).catch(() => {
        // Unchecked restrooms stay listed on /moderation for a manual check
      });
      // Success animation, then open the new restroom (button stays disabled meanwhile)
      setSaved(true);
      window.setTimeout(() => router.push(`/restroom/${restroom.id}`), SUCCESS_HOLD_MS);
    } catch (error) {
      setSubmitting(false);
      setUploadProgress(null);
      // The restroom wasn't saved: don't leave its photos behind in storage
      if (uploaded) void removeRestroomPhotos(createClient(), uploaded.paths);
      // Too many restrooms: keep the form as is and count down to the next try
      if (error instanceof RateLimitError) setRateLimitedUntil(error.retryAt.toISOString());
      toast({
        variant: "destructive",
        title: ta.saveFailed,
        description: errorText(error, t),
      });
    }
  };

  const toggleAmenity = (amenity: Amenity) =>
    update(
      "amenities",
      form.amenities.includes(amenity)
        ? form.amenities.filter((a) => a !== amenity)
        : [...form.amenities, amenity]
    );

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col">
      {/* Top bar: back + step indicator + cancel */}
      <div className="flex flex-col gap-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={goBack} className="-ml-2">
            <ArrowLeft aria-hidden="true" />
            {ta.back}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="-mr-2 text-muted-foreground"
          >
            <X aria-hidden="true" />
            {ta.cancel}
          </Button>
        </div>
        <h1 className="text-xl font-bold">{ta.heading}</h1>

        {/* Progress bar (fills smoothly) */}
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={ta.progressLabel}
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step + 1}
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT }}
          />
        </div>

        {/* Step indicators: done steps show an animated check */}
        <ol className="grid grid-cols-4 gap-1" aria-hidden="true">
          {ta.steps.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors duration-200",
                    done && "border-primary bg-primary text-primary-foreground",
                    current && "border-primary bg-primary/10 text-primary",
                    !done && !current && "border-border text-muted-foreground"
                  )}
                >
                  {done ? <AnimatedCheck className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[11px] transition-colors duration-200",
                    current ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="sr-only" aria-live="polite">
          {format(ta.stepStatus, { current: step + 1, total: STEP_COUNT, name: ta.steps[step] })}
        </p>
      </div>

      {/* Step content: slides left/right depending on direction */}
      <div className="relative flex flex-1 flex-col overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-1 flex-col gap-4 px-4 py-4"
          >
            {step === 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {ta.mapHint}
                </p>
                <div
                  className={cn(
                    "relative isolate h-[45dvh] min-h-64 overflow-hidden rounded-lg border",
                    errors.location && "border-destructive"
                  )}
                >
                  <LocationPicker value={form.location} onChange={handleLocationChange} focus={focus} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm" aria-live="polite">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {form.location ? (
                      <span className="font-mono text-xs">{formatCoords(form.location)}</span>
                    ) : (
                      <span className="text-muted-foreground">{ta.noPin}</span>
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseMyLocation}
                    disabled={geolocation.loading}
                  >
                    {geolocation.loading ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Crosshair aria-hidden="true" />
                    )}
                    {ta.useMyLocation}
                  </Button>
                </div>
                {errors.location && <FieldError key={`location-${errorAttempt}`} message={errorMessage.location} />}
              </>
            )}

            {step === 1 && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">{ta.name}</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={ta.namePlaceholder}
                    maxLength={LIMITS.name.max}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className={cn(errors.name && "border-destructive")}
                  />
                  {errors.name && <FieldError key={`name-${errorAttempt}`} id="name-error" message={errorMessage.name} />}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="address">{ta.address}</Label>
                    {form.location && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={geocoding}
                        onClick={() => form.location && void fillAddressFromPin(form.location)}
                      >
                        <Wand2 aria-hidden="true" />
                        {ta.fromPin}
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder={geocoding ? ta.findingAddress : ta.addressPlaceholder}
                      maxLength={LIMITS.address.max}
                      aria-invalid={Boolean(errors.address)}
                      aria-describedby={errors.address ? "address-error" : undefined}
                      className={cn("pr-9", errors.address && "border-destructive")}
                    />
                    {geocoding && (
                      <Loader2
                        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                        aria-label={ta.findingAddressLabel}
                      />
                    )}
                  </div>
                  {errors.address ? (
                    <FieldError key={`address-${errorAttempt}`} id="address-error" message={errorMessage.address} />
                  ) : geocodeFailed ? (
                    <p className="text-xs text-muted-foreground">
                      {ta.addressFailed}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">
                    {ta.description} <span className="font-normal text-muted-foreground">{ta.optional}</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder={ta.descriptionPlaceholder}
                    maxLength={LIMITS.description}
                    rows={4}
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {form.description.length}/{LIMITS.description}
                  </p>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">{ta.priceQuestion}</legend>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={ta.priceLabel}>
                    <ChoiceButton
                      role="radio"
                      selected={form.isFree}
                      onClick={() => update("isFree", true)}
                      icon={BadgeCheck}
                      label={t.restroom.free}
                    />
                    <ChoiceButton
                      role="radio"
                      selected={!form.isFree}
                      onClick={() => update("isFree", false)}
                      icon={CircleDollarSign}
                      label={t.restroom.paid}
                    />
                  </div>
                </fieldset>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">
                    {ta.amenitiesQuestion} <span className="font-normal text-muted-foreground">{ta.selectAll}</span>
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {AMENITY_OPTIONS.map((amenity) => (
                      <ChoiceButton
                        key={amenity}
                        role="checkbox"
                        selected={form.amenities.includes(amenity)}
                        onClick={() => toggleAmenity(amenity)}
                        icon={getAmenityIcon(amenity)}
                        label={t.amenities[amenity]}
                      />
                    ))}
                  </div>
                </fieldset>

                <ImageUploader
                  photos={photos}
                  onChange={setPhotos}
                  disabledReason={photosOffReason}
                  uploadProgress={uploadProgress}
                />
              </>
            )}

            {step === 3 && form.location && (
              <div className="flex flex-col gap-4">
                {rateLimitedUntil && (
                  <RateLimitNotice retryAt={rateLimitedUntil} onReady={clearRateLimit} variant="inline" />
                )}
                <p className="text-sm text-muted-foreground">{ta.reviewHint}</p>

                <ReviewSection title={ta.steps[0]} editLabel={ta.edit} onEdit={() => setStep(0)}>
                  <div className="relative isolate h-40 overflow-hidden rounded-md border">
                    {/* key: remount when the pin changes so the mini map recenters */}
                    <MiniMapLoader
                      key={locationKey(form.location)}
                      latitude={form.location.latitude}
                      longitude={form.location.longitude}
                      label={form.name}
                    />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{formatCoords(form.location)}</p>
                </ReviewSection>

                <ReviewSection title={ta.steps[1]} editLabel={ta.edit} onEdit={() => setStep(1)}>
                  <p className="font-semibold">{form.name.trim()}</p>
                  <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {form.address.trim()}
                  </p>
                  {form.description.trim() && (
                    <p className="whitespace-pre-line text-sm">{form.description.trim()}</p>
                  )}
                </ReviewSection>

                <ReviewSection title={ta.steps[2]} editLabel={ta.edit} onEdit={() => setStep(2)}>
                  <div className="flex flex-wrap gap-1.5">
                    <PriceBadge isFree={form.isFree} />
                    {form.amenities.map((amenity) => (
                      <AmenityBadge key={amenity} amenity={amenity} />
                    ))}
                  </div>
                  {form.amenities.length === 0 && (
                    <p className="text-xs text-muted-foreground">{ta.noAmenities}</p>
                  )}
                  {!photosOffReason && photos.length > 0 && (
                    <ul className="mt-1 grid grid-cols-3 gap-2" aria-label={ta.photos}>
                      {photos.map((photo, index) => (
                        <li key={photo.id} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                          <Image
                            src={photo.previewUrl}
                            alt={format(ta.photoAlt, { n: index + 1 })}
                            fill
                            sizes="33vw"
                            className="object-cover"
                            unoptimized
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </ReviewSection>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky action bar (main is the scroll container) */}
      <div className="sticky bottom-0 z-10 flex gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
        {step > 0 && (
          <AnimatedButton type="button" variant="outline" size="lg" onClick={goBack} className="flex-1">
            <ArrowLeft aria-hidden="true" />
            {ta.back}
          </AnimatedButton>
        )}
        {step < LAST_STEP ? (
          <AnimatedButton type="button" size="lg" onClick={goNext} className="flex-1">
            {ta.next}
            <ArrowRight aria-hidden="true" />
          </AnimatedButton>
        ) : (
          <AnimatedButton
            type="button"
            size="lg"
            onClick={() => void handleSubmit()}
            loading={submitting || saved}
            loadingText={uploadProgress ? format(ta.uploadingPhotos, uploadProgress) : ta.saving}
            disabled={rateLimitedUntil !== null}
            className="flex-1"
          >
            <Check aria-hidden="true" />
            {ta.submit}
          </AnimatedButton>
        )}
      </div>

      <ConfirmModal
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        variant="destructive"
        icon={X}
        title={ta.cancelTitle}
        description={ta.cancelDescription}
        confirmLabel={ta.cancelConfirm}
        cancelLabel={ta.cancelKeep}
        onConfirm={leave}
      />

      {/* Success: animated check, then the new restroom's page opens */}
      <AnimatePresence>
        {saved && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base }}
            role="status"
          >
            <motion.span
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              transition={SPRING}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-success-foreground shadow-lg"
            >
              <AnimatedCheck className="h-10 w-10" strokeWidth={3} />
            </motion.span>
            <p className="text-lg font-semibold">{ta.added}</p>
            <p className="text-sm text-muted-foreground">{ta.thanks}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- small presentational helpers ----------

/** Validation message; shakes when it appears (re-mount it with a new key to shake again). */
function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="animate-shake text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  );
}

interface ChoiceButtonProps {
  role: "radio" | "checkbox";
  selected: boolean;
  onClick: () => void;
  icon: ReturnType<typeof getAmenityIcon>;
  label: string;
}

/** Big tappable toggle used for amenities (checkbox) and Libre/May bayad (radio). */
function ChoiceButton({ role, selected, onClick, icon: Icon, label }: ChoiceButtonProps) {
  return (
    <motion.button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      whileTap={tapScale}
      transition={SPRING}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "bg-card hover:border-primary/30 hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {/* Check box with an animated tick */}
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-150",
          role === "radio" ? "rounded-full" : "rounded-md",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
      >
        {selected && <AnimatedCheck className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </motion.button>
  );
}

function ReviewSection({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs">
          <Pencil aria-hidden="true" />
          {editLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}
