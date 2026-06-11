# Form Auto-Fill Tool

**Languages:** [Tiếng Việt](README.md) | English

> **⚠️ IMPORTANT: This is an educational project. For reference only; use at your own risk.**

A desktop tool that scans and auto-fills Google Forms through a modern UI. It captures an entire multi-page form in a single load and supports weighted answer planning.

## Features

- **Complete scan**: Reads the form structure embedded in the page (`FB_PUBLIC_LOAD_DATA_`), capturing 100% of the questions across **all pages** in a single load, without clicking "Next" or filling anything first.
- **All question types**: text, paragraph, multiple choice, checkbox, dropdown, linear scale, date, time.
- **Multi-page forms (sections)**: Detects the page count, locates each question by its content (resilient to section headers / branching), and navigates pages in order.
- **Weighted answer plan**: Every answer carries a `weight`. Single-choice questions pick one by relative ratio; checkboxes use independent probability with min/max selections.
- **JSON + AI workflow**: Export the plan to JSON (with built-in `_instructions` guiding an AI to fill content & ratios), import it back, and **validate strictly** before running.
- **Mandatory dry-run**: Fills every page but does NOT submit, capturing a screenshot of the final page for your review before a real run.
- **Distribution report & error shots**: Tallies which answers were actually chosen; auto-captures a screenshot on error.
- **Anti-detection**: Uses [`puppeteer-real-browser`](https://github.com/zfcsoftware/puppeteer-real-browser) (rebrowser + ghost-cursor) and handles Cloudflare Turnstile automatically.
- **Progress & logs**: Real-time updates, logging via Winston.

## Tech stack

- **Desktop**: Electron + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Automation**: puppeteer-real-browser (puppeteer-core)
- **Logging**: Winston

## Installation

Requires Node.js 18+.

```bash
npm install
```

`puppeteer-real-browser` downloads Chrome on first run. On Linux you also need `xvfb`:

```bash
sudo apt-get install xvfb
```

## Running the app

```bash
# Development (main + renderer)
npm run dev

# Production build
npm run build
npm start
```

## How to use

1. **Scan Form**: Paste a Google Form URL (`https://docs.google.com/forms/d/e/.../viewform`) and click "Scan". The app generates a sample **answer plan** (equal ratios).
2. **Answer plan**: Adjust each answer's ratio with the slider, or:
   - **Export JSON** → send the file to an AI (it includes an `_instructions` section guiding the AI to fill text content & ratios) → **Import JSON** back.
   - The app **validates strictly**: required questions missing an answer, malformed emails, answers not present in the options, etc. are flagged in red and block execution.
3. **Execute**:
   - **Dry-run** first: fills all pages but does NOT submit, capturing a screenshot for you to review.
   - Once the dry-run looks right, set the run count / delay / browser visibility and **Run for real**.
   - Review the **distribution report** (how many times each answer was chosen) and error screenshots.

## How weighting works

| Question type                             | Meaning of `weight`                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| multiple_choice / dropdown / linear_scale | **Relative** ratio, pick exactly one (e.g. `Yes:90, No:10` → ~90% "Yes") |
| checkbox                                  | **Independent** probability (0..100%) each option is ticked, with min/max |
| text / paragraph / date / time            | A list of sample answers, one picked by ratio                            |

## Project structure

```
src/
├── main/        # Electron main process + preload (IPC)
├── scanner/     # FormScanner: reads FB_PUBLIC_LOAD_DATA_, DOM fallback
├── filler/      # FormFiller: weighted page-by-page filling, dry-run, error shots, report
├── utils/       # AnswerPlan (template + validate + weighting), ConfigManager, Logger
└── renderer/    # React UI (scan → plan → execute)
configs/         # Saved configurations (JSON)
logs/            # Winston logs + logs/screenshots (dry-run & error images)
```

## Scripts

```bash
npm run dev        # Run dev (main + renderer)
npm run build      # Build main + renderer
npm start          # Run the built app
npm run lint       # ESLint
npm run typecheck  # Type-check main + renderer
npm run dist       # Package the app (electron-builder)
```

## Known limitations

- File upload and grid questions (multiple choice grid / checkbox grid) are not filled yet.
- Forms requiring Google sign-in cannot be scanned (not public).
- `FB_PUBLIC_LOAD_DATA_` is defined by Google and may change in the future; if so, the scanner falls back to DOM scanning of the current page.

## License

MIT - see [LICENSE](LICENSE).

## Disclaimer

This project is for learning and research. Do not use it for spam or to violate any terms of service. Use responsibly.
