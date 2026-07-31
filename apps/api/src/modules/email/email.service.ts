import { env } from "../../config/env.js";

export type InvitationEmailInput = {
  invitationId: string;
  recipientEmail: string;
  inviterName: string;
  tripName: string;
  destination: string;
  invitationUrl: string;
};

export type EmailDeliveryStatus = "SENT" | "DEVELOPMENT" | "FAILED";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const sendInvitationEmail = async (
  input: InvitationEmailInput,
): Promise<EmailDeliveryStatus> => {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return "DEVELOPMENT";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `trip-invitation-${input.invitationId}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.recipientEmail],
        subject: `${input.inviterName} invited you to ${input.tripName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#132019">
            <p style="color:#b04a2b;font-weight:700;text-transform:uppercase;letter-spacing:.08em">TripSync invitation</p>
            <h1 style="font-family:Georgia,serif">You are invited to ${escapeHtml(input.tripName)}.</h1>
            <p><strong>${escapeHtml(input.inviterName)}</strong> invited you to help plan a group trip to ${escapeHtml(input.destination)}.</p>
            <p style="margin:32px 0">
              <a href="${escapeHtml(input.invitationUrl)}" style="background:#173f2e;color:white;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">View invitation</a>
            </p>
            <p style="color:#68726b;font-size:14px">This invitation expires in seven days. Only the invited email address can accept it.</p>
          </div>
        `,
      }),
    });

    return response.ok ? "SENT" : "FAILED";
  } catch {
    return "FAILED";
  }
};
