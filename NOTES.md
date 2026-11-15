# School's Helper — Notes

## Run it

1. Copy `.env.example` to `.env` and put your OpenAI API key after `OPENAI_API_KEY=`.
2. Start the project with: `node server.js`
3. Open `http://localhost:3000`.

The AI model is `gpt-5-mini` by default. You can change it with `OPENAI_MODEL` in `.env`.

## Current version

- Open-ended, multi-turn coach chat for school questions, planning, social practice, and emotional support.
- Visual, step-by-step math help across arithmetic, fractions, percentages, linear and quadratic algebra, function graphs, plane and solid geometry, trigonometry, polynomial calculus, descriptive statistics, probability, discrete math, sequences, and introductory linear algebra.
- Optional screenshot and photo attachments with an in-chat preview, image-size protection, privacy guidance, and multimodal help when the private AI server is connected.
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
- Add a dedicated computer-algebra service for advanced symbolic proofs, multi-variable calculus, and specialist university mathematics.
- Add a teacher/parent demo view with privacy explanations.
- Add optional voice input only after privacy and parental-consent review.
- Save progress locally without collecting identifying information.
