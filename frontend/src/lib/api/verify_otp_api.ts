import { apiPost } from "./client";
import { RegisterPayload } from "../schema/verify_otp";

export async function register(payload: RegisterPayload) {
  return apiPost("/auth/register", payload);
}
