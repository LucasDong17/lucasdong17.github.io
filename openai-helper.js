const ENDPOINT = 'https://api.openai.com/v1/responses';
const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don't want to live|do not want to live)\b/i;
const UNSAFE_PATTERN = /\b(hurt|kill|attack|bully|harass)\b.{0,35}\b(classmate|student|teacher|someone|them)\b/i;

export async function getCoachAnswer({ apiKey, model, brief, message }) {
  if (CRISIS_PATTERN.test(message)) {
    return 'Your safety comes first. Tell a trusted adult who can stay with you. In the U.S., call or text 988 now; if anyone is in immediate danger, call 911.';
  }
  if (UNSAFE_PATTERN.test(message)) {
    return 'I can’t help hurt or target someone. Step away, tell a trusted adult, and choose a safe way to handle the conflict.';
  }

  const instructions = `${brief}\n\nYou are the School's Helper coach inside a one-minute game. Follow the My AI's instructions and Safety plan above. Reply in 2–4 very short bullets, under 100 words. Teach; do not complete graded work. End with one quick check question.`;
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, instructions, input: message, max_output_tokens: 180, store: false })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);

  const answer = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!answer) throw new Error('The AI returned no text.');
  return answer.trim();
}
