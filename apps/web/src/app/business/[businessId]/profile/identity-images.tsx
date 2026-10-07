"use client";

import type { BusinessCatalog } from "@zed360/contracts";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeMediaUpload, prepareMediaUpload } from "../catalog/actions";

type Media = BusinessCatalog["media"][number];
type ImageType = "image/jpeg" | "image/png" | "image/webp";

const kinds = {
  logo: {
    title: "Logo",
    hint: "A square image works best, at least 400 × 400 pixels.",
    frame: "aspect-square w-28",
    empty: "No logo yet",
  },
  cover: {
    title: "Cover photo",
    hint: "A wide photo of your shop, your work, or your products, about 1600 × 900 pixels. It leads your card on the Zed360 homepage.",
    frame: "aspect-[16/9] w-full max-w-md",
    empty: "No cover photo yet",
  },
} as const;

const statusText = {
  approved: "Live on your profile",
  pending: "Awaiting Zed360 review",
  rejected: "Not approved",
} as const;

function IdentityImage({
  businessId,
  businessName,
  kind,
  current,
}: {
  businessId: string;
  businessName: string;
  kind: keyof typeof kinds;
  current: Media | null;
}) {
  const router = useRouter();
  const inputId = useId();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const details = kinds[kind];

  async function upload(file: File) {
    setUploading(true);
    setMessage("");
    setIsError(false);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Use a JPG, PNG, or WebP image.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("The image must be 5 MB or smaller.");
      }
      const mimeType = file.type as ImageType;
      const prepared = await prepareMediaUpload(businessId, {
        fileName: file.name,
        mimeType,
        fileSizeBytes: file.size,
        purpose: kind,
      });
      if (prepared.status === "error") throw new Error(prepared.message);

      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      bitmap.close();
      const { error } = await createClient()
        .storage.from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type,
        });
      if (error) throw new Error("The image could not be uploaded to storage.");

      const completed = await completeMediaUpload(businessId, {
        storagePath: prepared.path,
        mimeType,
        fileSizeBytes: file.size,
        width,
        height,
        purpose: kind,
        altText:
          kind === "logo"
            ? `${businessName} logo`
            : `${businessName} cover photo`,
      });
      if (completed.status === "error") throw new Error(completed.message);
      setMessage(
        "Uploaded. Zed360 reviews logos and cover photos before they appear on your profile.",
      );
      startTransition(() => router.refresh());
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{details.title}</h3>
        {current ? (
          <span
            className={`text-xs ${current.moderationStatus === "approved" ? "text-[var(--lime)]" : current.moderationStatus === "pending" ? "text-amber-100/85" : "text-red-200"}`}
          >
            {statusText[current.moderationStatus]}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm leading-6 text-white/55">{details.hint}</p>
      <div
        className={`relative mt-4 grid place-items-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/20 ${details.frame}`}
      >
        {current ? (
          <Image
            alt={current.altText}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            src={current.url}
            unoptimized
          />
        ) : (
          <span className="px-3 text-center text-xs text-white/50">
            {details.empty}
          </span>
        )}
      </div>
      {current?.moderationStatus === "rejected" && current.moderationNote ? (
        <p className="mt-3 text-sm text-red-200">
          Reason: {current.moderationNote}
        </p>
      ) : null}
      <label
        className={`button mt-4 w-fit cursor-pointer ${current ? "button-secondary" : "button-primary"} ${uploading ? "pointer-events-none opacity-60" : ""}`}
        htmlFor={inputId}
      >
        {uploading
          ? "Uploading…"
          : current
            ? `Replace ${details.title.toLowerCase()}`
            : `Upload ${details.title.toLowerCase()}`}
      </label>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
        type="file"
      />
      {message ? (
        <p
          className={`mt-3 text-sm ${isError ? "text-red-200" : "text-[var(--lime)]"}`}
          role={isError ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

// The newest upload is what the owner cares about: one awaiting review first,
// then the approved image, then a rejected one so its reason is visible.
function currentImage(media: Media[], purpose: "logo" | "cover") {
  const ofKind = media.filter((item) => item.purpose === purpose);
  return (
    ofKind.find((item) => item.moderationStatus === "pending") ??
    ofKind.find((item) => item.moderationStatus === "approved") ??
    ofKind.find((item) => item.moderationStatus === "rejected") ??
    null
  );
}

export function IdentityImages({
  businessId,
  businessName,
  media,
}: {
  businessId: string;
  businessName: string;
  media: Media[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <IdentityImage
        businessId={businessId}
        businessName={businessName}
        current={currentImage(media, "logo")}
        kind="logo"
      />
      <IdentityImage
        businessId={businessId}
        businessName={businessName}
        current={currentImage(media, "cover")}
        kind="cover"
      />
    </div>
  );
}
