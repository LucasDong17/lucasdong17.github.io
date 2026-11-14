const ENDPOINT = 'https://api.openai.com/v1/responses';
const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don['’]?t want to live|do not want to live|end my life)\b/i;
const UNSAFE_PATTERN = /\b(how (?:do|can) i|help me|tell me how to|i (?:want|plan|need) to)\b.{0,45}\b(hurt|kill|attack|bully|harass|poison|threaten)\b/i;

export async function getCoachAnswer({ apiKey, model, brief, message, history = [] }) {
  if (CRISIS_PATTERN.test(message)) {
    return 'Your safety comes first. Tell a trusted adult who can stay with you. In the U.S., call or text 988 now; if anyone is in immediate danger, call 911.';
  }
  if (UNSAFE_PATTERN.test(message)) {
    return 'I can’t help hurt or target someone. Step away, tell a trusted adult, and choose a safe way to handle the conflict.';
  }

  const instructions = `${brief}\n\nYou are the School's Helper coach in a calm, open-ended chat for students. Follow the My AI's instructions and Safety plan above. Be warm, steady, practical, and never shame the student. Answer the actual question to the best of your ability. Usually respond in 2–4 short paragraphs or bullets under 160 words, but use a little more detail when a clear explanation needs it. Offer one manageable next step. Ask at most one useful follow-up question. Do not diagnose, encourage dependency, provide harmful instructions, or complete graded work for the student. Refuse and safely redirect requests involving harm, threats, bullying, harassment, dangerous activity, or cheating. If facts are uncertain, say so.`;
  const input = [...history, { role: 'user', content: message }];
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, instructions, input, max_output_tokens: 320, store: false })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);

  const answer = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  if (!answer) throw new Error('The AI returned no text.');
  return answer.trim();
}
