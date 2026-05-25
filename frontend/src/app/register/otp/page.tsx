"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";

export default function OTPPage() {
  const [code, setCode] = useState("");

  async function handleVerify() {
    const res = await apiPost("/auth/verify-otp", { code });
    window.location.href = `/register/webauthn`;
  }

  return (
    <div>
      <h1>Enter OTP</h1>
      <input value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={handleVerify}>Verify</button>
    </div>
  );
}
