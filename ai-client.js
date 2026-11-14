const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don['’]?t want to live|do not want to live|end my life)\b/i;

export function isCrisisMessage(message) { return CRISIS_PATTERN.test(message); }

export async function askCoach(message, history = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(new URL('api/coach', document.baseURI), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: history.slice(-8) }),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The live coach took too long to answer.');
    throw new Error('The live coach is not connected right now.');
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'I could not connect right now. Please try again in a moment.');
  if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('The live coach returned an empty answer.');
  return data.answer;
}
