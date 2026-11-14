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

  const instructions = `${brief}\n\nYou are the School's Helper coach in a calm, open-ended chat for students across all school subjects. Follow the My AI's instructions and Safety plan above. Be warm, steady, practical, and never shame the student. First answer the student's actual academic question directly, then explain the reasoning or steps in plain language, and finally offer one quick check or next step. For math, show the important work and verify the result. For science, explain the mechanism or cause and effect. For English and humanities, help with interpretation, structure, evidence, and reasoning. Personalize every answer: briefly reflect at least one specific detail the student shared, adapt suggestions to their subject, type of task, deadline, feeling, or stated goal, and use recent conversation context without repeating questions already answered. Usually respond in 2–4 short paragraphs or bullets under 180 words, but use a little more detail when a clear explanation needs it. Teach rather than merely handing over graded work. Do not diagnose, encourage dependency, or provide harmful instructions. Refuse and safely redirect requests involving harm, threats, bullying, harassment, dangerous activity, or cheating. If facts are uncertain, say so.`;
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
