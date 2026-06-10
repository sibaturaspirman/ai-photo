"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InacoVirtualKeyboard } from "@/components/inaco/inaco-virtual-keyboard";
import {
  INACO_STORAGE,
  type InacoSocialPlatform,
  getIndonesianPhoneError,
  hasInacoGenerateAccess,
  isValidIndonesianPhone,
  saveInacoSubmissionData,
  saveInacoUserData,
  waitForInacoGenerateResult,
} from "@/lib/inaco/constants";

type ActiveField = "name" | "phone" | "username" | null;

type SubmitApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    data?: {
      qrUrl?: string;
      submissionId?: number | string;
    };
    qrUrl?: string;
    submissionId?: number | string;
  };
};

function extractSubmissionFromResponse(payload: SubmitApiResponse) {
  const nested = payload.data?.data;
  const qrUrl = nested?.qrUrl ?? payload.data?.qrUrl;
  const submissionId = nested?.submissionId ?? payload.data?.submissionId;
  if (!qrUrl) return null;
  return { qrUrl, submissionId };
}

export default function InacoFormPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [socialPlatform, setSocialPlatform] = useState<InacoSocialPlatform>("instagram");
  const [socialUsername, setSocialUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (!hasInacoGenerateAccess()) {
      router.replace("/inaco/cam");
    }
  }, [router]);

  const phoneError = useMemo(() => getIndonesianPhoneError(phone), [phone]);
  const showPhoneError = phoneTouched && phoneError !== null;

  const canSubmit = useMemo(() => {
    return (
      name.trim().length > 0 &&
      phone.trim().length > 0 &&
      isValidIndonesianPhone(phone) &&
      socialUsername.trim().length > 0
    );
  }, [name, phone, socialPlatform, socialUsername]);

  const setActiveFieldSafe = (field: ActiveField) => {
    if (activeField === "phone") setPhoneTouched(true);
    setActiveField(field);
  };

  const closeKeyboard = () => {
    if (activeField === "phone") setPhoneTouched(true);
    setActiveField(null);
  };

  const updateActiveValue = (updater: (prev: string) => string) => {
    if (activeField === "name") setName(updater);
    else if (activeField === "phone") setPhone(updater);
    else if (activeField === "username") setSocialUsername(updater);
  };

  const handleKeyboardInput = (value: string) => {
    if (!activeField) return;
    if (activeField === "phone") {
      if (!/^\d$/.test(value)) return;
      setPhone((prev) => (prev.length >= 15 ? prev : `${prev}${value}`));
      return;
    }
    if (activeField === "name" && name.length >= 60) return;
    if (activeField === "username" && socialUsername.length >= 40) return;
    updateActiveValue((prev) => `${prev}${value}`);
  };

  const handleKeyboardBackspace = () => {
    updateActiveValue((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    setPhoneTouched(true);
    if (!canSubmit || isSubmitting || phoneError) return;
    if (!hasInacoGenerateAccess()) {
      router.replace("/inaco/cam");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    setActiveField(null);

    try {
      let result = window.localStorage.getItem(INACO_STORAGE.result);
      if (!result) {
        result = await waitForInacoGenerateResult();
      }

      const response = await fetch("/api/inaco/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          waNumber: phone.trim(),
          socialMediaChannel: socialPlatform,
          socialMediaAccount: socialUsername.trim(),
          result,
        }),
      });

      const data = (await response.json()) as SubmitApiResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Gagal submit data.");
      }

      const submission = extractSubmissionFromResponse(data);
      if (!submission?.qrUrl) {
        throw new Error("Response submit tidak mengembalikan qrUrl.");
      }

      saveInacoUserData({
        name: name.trim(),
        phone: phone.trim(),
        socialPlatform,
        socialUsername: socialUsername.trim(),
      });
      saveInacoSubmissionData(submission);
      router.push("/inaco/result");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Gagal submit data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const keyboardMode =
    activeField === "phone" ? "numeric" : activeField === "username" ? "username" : "text";

  return (
    <main
      className={`inaco-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8 ${activeField ? "inaco-form-page--keyboard-open" : ""}`}
    >
      <div className="inaco-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />

      <form
        className="inaco-form relative z-10"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="inaco-form__field">
          <label className="inaco-form__label" htmlFor="inaco-name">
            Nama
          </label>
          <input
            id="inaco-name"
            type="text"
            value={name}
            readOnly
            onFocus={() => setActiveFieldSafe("name")}
            placeholder="Ketik nama kamu"
            className={`inaco-form__input ${activeField === "name" ? "inaco-form__input--active" : ""}`}
            autoComplete="off"
            disabled={isSubmitting}
          />
        </div>

        <div className="inaco-form__field">
          <label className="inaco-form__label" htmlFor="inaco-phone">
            No WhatsApp
          </label>
          <input
            id="inaco-phone"
            type="text"
            inputMode="none"
            value={phone}
            readOnly
            onFocus={() => setActiveFieldSafe("phone")}
            placeholder="Ketik no whatsapp kamu"
            className={`inaco-form__input ${activeField === "phone" ? "inaco-form__input--active" : ""} ${showPhoneError ? "inaco-form__input--error" : ""}`}
            autoComplete="off"
            disabled={isSubmitting}
          />
          {showPhoneError ? <p className="inaco-form__error">{phoneError}</p> : null}
        </div>

        <div className="inaco-form__field !mb-0">
          <p className="inaco-form__label">Akun Sosial Media</p>
          <div className="inaco-form__social-toggle">
            <button
              type="button"
              className={`inaco-form__social-btn ${socialPlatform === "instagram" ? "inaco-form__social-btn--active" : ""}`}
              onClick={() => {
                setSocialPlatform("instagram");
                setActiveFieldSafe(null);
              }}
              disabled={isSubmitting}
            >
              Instagram
            </button>
            <button
              type="button"
              className={`inaco-form__social-btn ${socialPlatform === "tiktok" ? "inaco-form__social-btn--active" : ""}`}
              onClick={() => {
                setSocialPlatform("tiktok");
                setActiveFieldSafe(null);
              }}
              disabled={isSubmitting}
            >
              TikTok
            </button>
          </div>
          <input
            id="inaco-social-username"
            type="text"
            value={socialUsername}
            readOnly
            onFocus={() => setActiveFieldSafe("username")}
            placeholder="Ketik username akun"
            className={`inaco-form__input ${activeField === "username" ? "inaco-form__input--active" : ""}`}
            autoComplete="off"
            disabled={isSubmitting}
          />
          <p className="inaco-form__hint">
            <span className="inaco-form__hint-icon" aria-hidden>
              i
            </span>
            username akun sosial media kamu
          </p>
        </div>

        {submitError ? (
          <p className="text-center text-[2.6vw] font-semibold text-red-200">{submitError}</p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          onFocus={() => closeKeyboard()}
          className={`inaco-form__submit  ${canSubmit && !isSubmitting ? "inaco-form__submit--active" : ""} ${isSubmitting ? "animate-bounce" : ""}`}
        >
          {isSubmitting ? "Submitting & Generating..." : "Submit"}
        </button>
      </form>

      {activeField && !isSubmitting ? (
        <InacoVirtualKeyboard
          mode={keyboardMode}
          onInput={handleKeyboardInput}
          onBackspace={handleKeyboardBackspace}
          onClose={closeKeyboard}
        />
      ) : null}
    </main>
  );
}
