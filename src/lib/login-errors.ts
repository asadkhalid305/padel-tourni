const LOGIN_ERROR_MESSAGES = {
  "account-creation-failed": "Account creation failed.",
  "auth-not-configured": "Authentication is not configured.",
  "google-sign-in-failed": "Google sign in failed.",
  "missing-code": "Missing code.",
  "missing-email": "Missing email.",
  "session-exchange-failed": "Session exchange failed.",
} as const;

export function formatLoginErrorMessage(error?: string | null) {
  if (!error) {
    return null;
  }

  return (
    LOGIN_ERROR_MESSAGES[error as keyof typeof LOGIN_ERROR_MESSAGES] ??
    humanizeErrorId(error)
  );
}

function humanizeErrorId(error: string) {
  const words = error.trim().split(/[-_]+/).filter(Boolean);

  if (words.length === 0) {
    return "Something went wrong.";
  }

  const [firstWord, ...restWords] = words;
  const first = firstWord[0]?.toUpperCase() + firstWord.slice(1);
  const rest = restWords.join(" ");

  return rest ? `${first} ${rest}.` : `${first}.`;
}
