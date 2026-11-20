"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AlertCircleIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CONDITIONS } from "@/lib/domain";
import type { UploadMode } from "@/lib/listings/upload-mode";
import {
  checkPhotoFile,
  PHOTO_ACCEPT,
  PHOTO_TYPES,
} from "@/lib/listings/photo";
import {
  DESCRIPTION_MAX,
  LISTING_FIELDS,
  TITLE_MAX,
  validateListing,
  type FieldErrors,
  type ListingField,
} from "@/lib/listings/validate";

type Values = Record<ListingField, string>;

type ListingFormProps = {
  neighborhoods: readonly string[];
  uploadMode: UploadMode;
  /** Set when editing; the form then sends PATCH instead of POST. */
  listingId?: string;
  initial?: Partial<Values>;
  /** Where to send the visitor if their session has ended. */
  signInHref: string;
};

const EMPTY: Values = {
  title: "",
  description: "",
  photoUrl: "",
  category: "",
  condition: "",
  neighborhood: "",
  availableFrom: "",
  availableTo: "",
};

const fieldId = (field: ListingField) => `listing-${field}`;

export function ListingForm({
  neighborhoods,
  uploadMode,
  listingId,
  initial,
  signInHref,
}: ListingFormProps) {
  const router = useRouter();
  const editing = Boolean(listingId);
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview of the chosen photo before it is uploaded; freed when replaced
  // or when the form goes away.
  const previewRef = useRef("");
  useEffect(() => () => URL.revokeObjectURL(previewRef.current), []);
  function setPhoto(chosen: File | null) {
    URL.revokeObjectURL(previewRef.current);
    previewRef.current = chosen ? URL.createObjectURL(chosen) : "";
    setPreview(previewRef.current);
    setFile(chosen);
  }

  const set = (field: ListingField) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function showErrors(next: FieldErrors) {
    setErrors(next);
    const first = LISTING_FIELDS.find((f) => next[f]);
    if (first) {
      // Wait for the error text to render, then move focus to the first problem.
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>(`#${fieldId(first)}`)
          ?.focus(),
      );
    }
  }

  function choosePhoto(chosen: File | undefined) {
    setPhoto(chosen ?? null);
    const problem = chosen ? checkPhotoFile(chosen) : null;
    setErrors((e) => ({ ...e, photoUrl: problem ?? undefined }));
  }

  async function uploadPhoto(photo: File): Promise<string> {
    if (uploadMode === "blob") {
      const name = `listings/${crypto.randomUUID()}.${PHOTO_TYPES[photo.type]}`;
      try {
        const blob = await upload(name, photo, {
          access: "public",
          handleUploadUrl: "/api/uploads",
          contentType: photo.type,
        });
        return blob.url;
      } catch {
        throw new PhotoError();
      }
    }
    const body = new FormData();
    body.append("photo", photo);
    const response = await fetch("/api/uploads", { method: "POST", body });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new SignedOut();
    if (!response.ok) throw new PhotoError(data.error);
    return data.url;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError("");

    // Check everything in the browser first. A newly chosen photo counts as
    // the photo; it is checked as a file instead of as an address.
    const photoProblem = file ? checkPhotoFile(file) : null;
    const check = validateListing(
      file ? { ...values, photoUrl: "/pending-upload" } : values,
      neighborhoods,
    );
    const found: FieldErrors = check.ok ? {} : { ...check.errors };
    if (photoProblem) found.photoUrl = photoProblem;
    if (Object.keys(found).length > 0) return showErrors(found);

    setSaving(true);
    try {
      let photoUrl = values.photoUrl;
      if (file) {
        photoUrl = await uploadPhoto(file);
        // Keep the uploaded photo, so trying again doesn't upload it twice.
        setValues((v) => ({ ...v, photoUrl }));
        setPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      const response = await fetch(
        editing ? `/api/listings/${listingId}` : "/api/listings",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, photoUrl }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        router.push(`/listings/${data.listing.id}`);
        return; // keep the button disabled while the next page loads
      }
      if (response.status === 401) throw new SignedOut();
      if (response.status === 400 && data.fields) {
        showErrors(data.fields);
      } else {
        setFormError(data.error ?? "Something went wrong. Try again.");
      }
    } catch (error) {
      if (error instanceof SignedOut) {
        window.location.assign(signInHref);
        return;
      }
      if (error instanceof PhotoError) {
        showErrors({ photoUrl: error.message });
      } else {
        setFormError(
          "The listing could not be saved. Check your connection and try again.",
        );
      }
    }
    setSaving(false);
  }

  const currentPhoto = preview || values.photoUrl;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6"
    >
      {/* Disabled while saving, so nothing changes mid-upload. */}
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-6">
        {formError && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-md border border-error px-3 py-2 text-error"
          >
            <AlertCircleIcon className="shrink-0" />
            {formError}
          </p>
        )}

        <Input
          id={fieldId("title")}
          label="Title"
          value={values.title}
          onChange={(e) => set("title")(e.target.value)}
          error={errors.title}
          maxLength={TITLE_MAX}
          required
          autoComplete="off"
        />

        <Textarea
          id={fieldId("description")}
          label="Description"
          hint="What it is, what it's good for, and anything a borrower should know."
          value={values.description}
          onChange={(e) => set("description")(e.target.value)}
          error={errors.description}
          maxLength={DESCRIPTION_MAX}
          required
        />

        <Field
          id={fieldId("photoUrl")}
          label="Photo"
          hint={`JPEG, PNG or WebP, up to 5 MB.${editing ? " Leave empty to keep the current photo." : ""}`}
          error={errors.photoUrl}
        >
          {(control) => (
            <input
              {...control}
              ref={fileInputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              required={!editing}
              disabled={uploadMode === "unavailable"}
              onChange={(e) => choosePhoto(e.target.files?.[0])}
              className="rounded-md text-foreground file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-input-border file:bg-surface file:px-4 file:py-2 file:font-medium file:text-foreground hover:file:bg-border"
            />
          )}
        </Field>
        {uploadMode === "unavailable" && (
          <p className="text-sm text-error">
            Photo uploads are not available right now, so new listings
            can&apos;t be added. Try again later.
          </p>
        )}
        {currentPhoto && !errors.photoUrl && (
          <div className="relative aspect-[4/3] w-full max-w-xs overflow-hidden rounded-md border border-border">
            <Image
              src={currentPhoto}
              alt={file ? "Preview of the chosen photo" : "Current photo"}
              fill
              unoptimized={Boolean(preview)}
              sizes="320px"
              className="object-cover"
            />
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <Select
            id={fieldId("category")}
            label="Category"
            options={CATEGORIES}
            placeholder="Choose a category"
            value={values.category}
            onChange={(e) => set("category")(e.target.value)}
            error={errors.category}
            required
          />
          <Select
            id={fieldId("condition")}
            label="Condition"
            options={CONDITIONS}
            placeholder="Choose a condition"
            value={values.condition}
            onChange={(e) => set("condition")(e.target.value)}
            error={errors.condition}
            required
          />
        </div>

        <Select
          id={fieldId("neighborhood")}
          label="Neighborhood"
          options={neighborhoods}
          placeholder="Choose a neighborhood"
          value={values.neighborhood}
          onChange={(e) => set("neighborhood")(e.target.value)}
          error={errors.neighborhood}
          required
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">Available</legend>
          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id={fieldId("availableFrom")}
              label="From"
              type="date"
              value={values.availableFrom}
              onChange={(e) => set("availableFrom")(e.target.value)}
              error={errors.availableFrom}
              required
            />
            <Input
              id={fieldId("availableTo")}
              label="To"
              type="date"
              min={values.availableFrom || undefined}
              value={values.availableTo}
              onChange={(e) => set("availableTo")(e.target.value)}
              error={errors.availableTo}
              required
            />
          </div>
        </fieldset>
      </fieldset>

      <div>
        <Button
          type="submit"
          disabled={saving || (!editing && uploadMode === "unavailable")}
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Publish listing"}
        </Button>
      </div>
    </form>
  );
}

class SignedOut extends Error {}
class PhotoError extends Error {
  constructor(message?: string) {
    super(message || "The photo could not be uploaded. Try again.");
  }
}
