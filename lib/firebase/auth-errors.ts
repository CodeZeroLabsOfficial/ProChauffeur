import { FirebaseError } from "firebase/app";

export function authErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return (
          "Invalid email or password. If you normally sign in with Apple or Google on the mobile app, " +
          "that account may not have a password yet — use “Forgot password?” or add Email/Password in " +
          "Firebase Console → Authentication → Users."
        );
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a few minutes and try again.";
      case "auth/unauthorized-domain":
        return "This domain is not authorised in Firebase. Add pro-chauffeur.vercel.app under Authentication → Settings → Authorised domains.";
      case "auth/requests-from-referer-are-blocked":
        return "Firebase API key is blocking this site. In Google Cloud → Credentials, allow referrers: https://pro-chauffeur.vercel.app/*";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      case "auth/operation-not-allowed":
        return "Email/password sign-in is not enabled. Enable it in Firebase Authentication → Sign-in method.";
      case "auth/email-already-in-use":
        return "That email address is already in use.";
      case "auth/requires-recent-login":
        return "For security, sign out and sign in again, then retry.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      default:
        return `Authentication failed (${error.code}). Check Firebase Auth settings for this project.`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
