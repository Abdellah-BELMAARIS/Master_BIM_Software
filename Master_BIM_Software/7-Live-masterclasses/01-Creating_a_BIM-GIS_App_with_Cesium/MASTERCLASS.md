# Live 01 — Embeddings for BIM Workflows

Built on top of the Module 6 platform.

## What embeddings are
- Text → **tokens** → each token gets a **vector** (numbers that encode meaning).
- Parameters ≈ tokens × dimensions. Close vectors = similar meaning (cosine similarity).
- "Exterior brick wall 20 cm" and "Masonry façade 200 mm" share 0 words but are ~55% similar.

## Implemented: AI Semantic Search (BIM Studio ▼ → AI Semantic Search)
Model: `Xenova/all-MiniLM-L6-v2` (384 dims, ~23 MB, runs locally in the browser via `@huggingface/transformers`).

| Tab | What it does |
|---|---|
| Search | Natural-language query → selects matching elements in the 3D viewer |
| IFC Class | Suggests an IFC class from each element name, flags mismatches |
| Classify | Maps elements to a `CODE \| description` database (Uniclass/cost items), top-3 + CSV export |
| Group | Clusters element types by meaning, click a group to select it |
| Lab | Pair comparison + known limits (numbers, negation) |
| Transcribe | Transcribes a local English audio file in-browser with Whisper; edit, download, or search the transcript against the indexed BIM model |

Code:
- `src/bim-components/SemanticEmbeddings/index.ts` — engine (index, embed, search, classify, map, group, select)
- `src/react-components/EmbeddingsStudio.tsx` — panel UI

The transcription model (`Xenova/whisper-tiny.en`) is downloaded and cached on first use. Audio files are decoded and processed locally in the browser; supported file formats depend on the browser's audio decoder.

## Limits
Numbers (20 cm vs 200 cm) and negation (fire-rated vs non fire-rated) score as "similar" — always keep a human in the loop.

Source: https://people.thatopen.com/c/recorded-live-masterclasses-master-bim-software-developer/
