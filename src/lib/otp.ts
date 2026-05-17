// src/lib/otp.ts
// OTP Generator — 6 digit numeric code

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOTPExpiry(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isOTPExpired(expiry: Date | null): boolean {
  if (!expiry) return true;
  return new Date() > expiry;
}
