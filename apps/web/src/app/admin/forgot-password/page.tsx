import type { Metadata } from "next";
import { AdminPasswordRequestForm } from "./password-request-form";

export const metadata: Metadata = {
  title: "Set administrator password",
  description: "Secure password setup for Zed360 platform administrators.",
};

export default function AdminForgotPasswordPage() {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:pt-24">
      <div>
        <p className="eyebrow">
          <span /> Secure account recovery
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Set your admin password.
        </h1>
        <p className="mt-5 max-w-md leading-7 text-white/48">
          Enter the username assigned to your administrator account. We will
          send a secure setup link to its verified email address.
        </p>
      </div>
      <AdminPasswordRequestForm />
    </main>
  );
}
