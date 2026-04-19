"use client";

import { apiPost } from "@/lib/api/client";
import { webauthnRegister } from "@/lib/webauthn";

export default function WebAuthnRegPage({ searchParams }: any) {
  const userId = searchParams.user_id;

  async function handleRegister() {
    const options = await apiPost("/webauthn/register/options");

    const cred = await webauthnRegister(options);

    await apiPost("/webauthn/register/verify", cred);

    window.location.href = "/dashboard";
  }

  return (
    <div>
      <h1>Register Device</h1>
      <button onClick={handleRegister}>Register WebAuthn</button>
    </div>
  );
}
