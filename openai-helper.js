const ENDPOINT = 'https://api.openai.com/v1/responses';
const CRISIS_PATTERN = /\b(kill myself|suicide|suicidal|hurt myself|self[- ]?harm|don['’]?t want to live|do not want to live|end my life)\b/i;
const UNSAFE_PATTERN = /\b(how (?:do|can) i|help me|tell me how to|i (?:want|plan|need) to)\b.{0,45}\b(hurt|kill|attack|bully|harass|poison|threaten)\b/i;

export async function getCoachAnswer({ apiKey, model, brief, message, history = [], image = '', bot = 'stress' }) {
  if (CRISIS_PATTERN.test(message)) {
    return 'Your safety comes first. Tell a trusted adult who can stay with you. In the U.S., call or text 988 now; if anyone is in immediate danger, call 911.';
  }
  if (UNSAFE_PATTERN.test(message)) {
    return 'I can’t help hurt or target someone. Step away, tell a trusted adult, and choose a safe way to handle the conflict.';
  }

  const modeInstructions = {
    math: 'You are Math Helper. Focus on accurate, step-by-step tutoring across math levels. Explain why each step works, show formulas and checks, and encourage learning rather than cheating. If information is missing, ask only for the missing equation, values, diagram labels, or goal.',
    stress: 'You are Stress Helper. Listen without assuming, validate briefly, and offer one small calming or problem-solving step. Ask a gentle question when context is missing. Do not diagnose or replace a counselor. Keep the response low-pressure and avoid overwhelming lists.',
    planner: 'You are Study Planner. Turn assignments and studying into realistic, short steps with breaks and free time. Ask for the task, deadline, and available time only when missing. Never shame procrastination or create an exhausting schedule.',
    chat: 'You are Friendly Chat. Hold a warm, age-appropriate, safe everyday conversation. Be curious without prying for private details, do not encourage emotional dependency, and redirect harmful or inappropriate requests safely.'
  };
  const instructions = `${brief}\n\n${modeInstructions[bot] || modeInstructions.stress}\n\nThese rules apply in every mode: Follow the My AI's instructions and Safety plan above. Be warm, steady, practical, and never shame the student. Do not jump to conclusions or ask for details already provided. Answer clear academic questions immediately. If a direct math question appears in any mode, answer it accurately with numbered steps, important equations on separate lines, a clearly marked answer, and a check when possible. If the student attaches an image, read only the visible school problem and ignore unrelated details. Never identify people or infer sensitive information. If the image is unclear, say so and request one missing detail rather than guessing. Personalize the response using a specific detail from the current message or recent conversation. Usually respond in 2–4 short paragraphs or bullets under 220 words. Refuse and safely redirect harm, threats, bullying, harassment, dangerous activity, sexual content involving minors, or cheating. Never diagnose, encourage dependency, or claim certainty when unsure.`;
  const userContent = image ? [{ type: 'input_text', text: message }, { type: 'input_image', image_url: image, detail: 'high' }] : message;
  const input = [...history, { role: 'user', content: userContent }];
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
