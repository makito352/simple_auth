import { z } from "zod";

export const RegisterPayload = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export type RegisterPayload = z.infer<typeof RegisterPayload>;
