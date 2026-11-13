const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don't want to live|do not want to live)\b/i;

export function isCrisisMessage(message) {
  return CRISIS_PATTERN.test(message);
}

export async function askCoach(message) {
  const response = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Please check the API key and internet connection, then try again.');
  return data.answer;
}
