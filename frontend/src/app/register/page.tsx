"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");

  async function handleSubmit() {
    await apiPost("/auth/start", { email });
    window.location.href = `/register/otp?email=${email}`;
  }

  return (
    <div>
      <h1>Register</h1>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
      />
      <button onClick={handleSubmit}>Send OTP</button>
    </div>
  );
}
