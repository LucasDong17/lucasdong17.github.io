# School's Helper — Notes

## Run it

1. Copy `.env.example` to `.env` and put your OpenAI API key after `OPENAI_API_KEY=`.
2. Start the project with: `node server.js`
3. Open `http://localhost:3000`.

The AI model is `gpt-5-mini` by default. You can change it with `OPENAI_MODEL` in `.env`.

## Current version

- Open-ended, multi-turn coach chat for school questions, planning, social practice, and emotional support.
- Visual, step-by-step math help for linear equations, function graphs, circle and polygon measurements, right triangles, slope, distance, and midpoint questions.
- Warm suggested prompts, clear privacy reminders, and a breathing guide.
- Optional six-pair calm matching game with no timer, score, or failure state.
- Keyboard, mouse, and touch controls.
- Real OpenAI Responses API calls through a local Node server; the API key never enters browser code.
- The full AI instructions in `BRIEF.md` are sent as system instructions on every request.
- Crisis-language and unsafe-request guardrails in both the browser and server.
- Friendly error handling when the key or internet connection is unavailable.
- Responsive design and reduced-motion support.

## Maybe Later

- Let a student paste a real assignment and generate the three stations from it.
- Add text-to-speech, dyslexia-friendly type, and more accessibility settings.
- Add more symbolic algebra and advanced geometry tools through the connected AI service.
- Add a teacher/parent demo view with privacy explanations.
- Add optional voice input only after privacy and parental-consent review.
- Save progress locally without collecting identifying information.
