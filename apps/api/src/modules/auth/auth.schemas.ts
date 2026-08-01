import { z } from "zod";

export const registerBodySchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Display name must contain at least 2 characters")
      .max(50, "Display name must contain at most 50 characters"),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),

    password: z
      .string()
      .min(12, "Password must contain at least 12 characters")
      .max(128, "Password must contain at most 128 characters"),
  })
  .strict();

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),

    password: z
      .string()
      .min(1, "Password is required")
      .max(128, "Password must contain at most 128 characters"),
  })
  .strict();

export type LoginBody = z.infer<typeof loginBodySchema>;

export const avatarBodySchema = z
  .object({
    avatarDataUrl: z
      .string()
      .max(1_500_000, "Profile photo must be smaller than 1 MB")
      .regex(
        /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
        "Choose a JPEG, PNG or WebP image",
      )
      .nullable(),
  })
  .strict();

export const forgotPasswordBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),
  })
  .strict();

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(12, "Password must contain at least 12 characters")
      .max(128, "Password must contain at most 128 characters"),
  })
  .strict();

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
