const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don['’]?t want to live|do not want to live|end my life)\b/i;

export function isCrisisMessage(message) { return CRISIS_PATTERN.test(message); }

export async function askCoach(message, history = []) {
  const response = await fetch('/api/coach', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: history.slice(-8) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'I could not connect right now. Please try again in a moment.');
  return data.answer;
}
