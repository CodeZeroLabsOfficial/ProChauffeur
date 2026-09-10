/** Shared password strength rules for onboarding and account change. */

export type PasswordRequirement = {
  id: string;
  text: string;
  test: (password: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: "length",
    text: "At least 12 characters",
    test: (password) => password.length >= 12
  },
  {
    id: "lower",
    text: "At least 1 lowercase letter",
    test: (password) => /[a-z]/.test(password)
  },
  {
    id: "upper",
    text: "At least 1 uppercase letter",
    test: (password) => /[A-Z]/.test(password)
  },
  {
    id: "number",
    text: "At least 1 number",
    test: (password) => /[0-9]/.test(password)
  },
  {
    id: "special",
    text: "At least 1 special character",
    test: (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  }
];

export function passwordRequirementResults(password: string) {
  return PASSWORD_REQUIREMENTS.map((req) => ({
    id: req.id,
    text: req.text,
    met: req.test(password)
  }));
}

export function passwordStrengthScore(password: string): number {
  return passwordRequirementResults(password).filter((r) => r.met).length;
}

export function isPasswordStrong(password: string): boolean {
  return passwordStrengthScore(password) === PASSWORD_REQUIREMENTS.length;
}

export function passwordStrengthLabel(score: number): string {
  if (score === 0) return "Enter a password";
  if (score <= 2) return "Weak password";
  if (score <= 3) return "Medium password";
  if (score === 4) return "Strong password";
  return "Very strong password";
}

export function passwordStrengthBarClass(score: number): string {
  if (score === 0) return "bg-border";
  if (score <= 1) return "bg-destructive";
  if (score <= 2) return "bg-orange-500";
  if (score <= 3) return "bg-amber-500";
  if (score === 4) return "bg-yellow-400";
  return "bg-green-500";
}

export function validatePasswordPair(
  password: string,
  confirm: string
): { ok: true } | { ok: false; error: string } {
  if (!isPasswordStrong(password)) {
    return {
      ok: false,
      error:
        "Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character."
    };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }
  return { ok: true };
}
