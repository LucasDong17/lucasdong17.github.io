# School's Helper — Notes

## Run it

1. Copy `.env.example` to `.env` and put your OpenAI API key after `OPENAI_API_KEY=`.
2. Start the project with: `node server.js`
3. Open `http://localhost:3000`.

The AI model is `gpt-5-mini` by default. You can change it with `OPENAI_MODEL` in `.env`.

## Done in Version 1

- One short, replayable level connecting planning, academic tutoring, active recall, and social practice.
- Start, win/Game Over, Play Again, score, three lives, and a 75-second timer.
- Keyboard, mouse, and touch controls.
- Real OpenAI Responses API call through a local Node server; the API key never enters browser code.
- The full AI instructions in `BRIEF.md` are sent as system instructions on every AI request.
- Crisis-language and unsafe-request guardrails in both the browser and server.
- Friendly AI error message when the key or internet connection is unavailable.
- Responsive, original shape-based art and reduced-motion support.

## Maybe Later

- Let a student paste a real assignment and generate the three stations from it.
- Add text-to-speech, dyslexia-friendly type, and more accessibility settings.
- Add several subject paths and a spaced-repetition card deck.
- Add a teacher/parent demo view with privacy explanations.
- Add optional voice input only after privacy and parental-consent review.
- Save progress locally without collecting identifying information.
