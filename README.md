# Occult Corpus Research

A comprehensive computational research platform for analyzing discourse patterns, semantic networks, and thematic structures within online occult communities.

## Overview

This project builds a structured corpus from public forum discussions (Reddit, Wizard Forums) and applies modern NLP techniques—topic modeling, named entity recognition, and network analysis—to understand how occult knowledge is shared, evolved, and connected across digital spaces.

**Research Questions:**
- What are the dominant thematic clusters in contemporary occult discourse?
- How do semantic networks connect deities, practices, and concepts across traditions?
- How does community engagement (upvotes, comments) correlate with content themes?

## Features

- **Multi-source scraping**: Reddit (PRAW) and Wizard Forums (custom crawler)
- **Privacy-preserving pipeline**: Author anonymization via SHA-256 hashing, PII removal
- **NLP processing**: SpaCy NER, BERTopic/LDA topic modeling, sentence embeddings
- **Network analysis**: Co-occurrence and semantic similarity networks
- **Interactive visualization**: React frontend with Plotly and D3.js
- **Reproducible research**: Jupyter notebooks for exploratory analysis
- **ACM-formatted paper**: LaTeX template for publication-ready output

## Project Structure

```
occult-corpus-research/
├── data/
│   ├── raw/              # Raw scraped data (JSONL)
│   ├── processed/        # Cleaned and tokenized documents
│   ├── entities/         # Extracted named entities
│   └── networks/         # Network adjacency lists
├── src/
│   ├── schema.py         # Core Pydantic data models
│   ├── scrapers/         # Reddit & Wizard Forums crawlers
│   ├── preprocessing/    # Text cleaning & normalization
│   ├── analysis/         # Topic modeling, NER, networks
│   └── visualization/    # Chart & graph generation
├── notebooks/            # Jupyter analysis notebooks
├── paper/                # LaTeX ACM paper
├── website/              # React frontend
├── tests/                # Unit tests
├── config.yaml           # Default configuration
└── requirements.txt      # Python dependencies
```

## Quick Start

### Prerequisites

- Python 3.11+
- Git
- (Optional) Node.js 18+ for frontend

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd occult-corpus-research

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_lg

# Copy and customize configuration
cp config.yaml config.local.yaml
```

### Running Tests

```bash
pytest tests/ -v --cov=src
```

### Data Pipeline (Coming Soon)

```bash
# 1. Scrape
python -m src.scrapers.reddit --config config.local.yaml
python -m src.scrapers.wizardforums --config config.local.yaml

# 2. Preprocess
python -m src.preprocessing.pipeline --input data/raw --output data/processed

# 3. Analyze
python -m src.analysis.topics --input data/processed --output data/models
python -m src.analysis.networks --input data/processed --output data/networks

# 4. Visualize
python -m src.visualization.dashboard --data data/processed
```

## Data Ethics Statement

This project adheres to the following ethical guidelines:

1. **Public Data Only**: We collect only publicly accessible posts and comments. No private messages, restricted communities, or deleted content.

2. **Anonymization**: All author identities are hashed using SHA-256. Original usernames are never stored or displayed.

3. **PII Removal**: Email addresses, phone numbers, and other personally identifiable information are removed during preprocessing.

4. **Terms of Service Compliance**: Scraping respects platform rate limits and robots.txt. Reddit data is collected via official API (PRAW).

5. **No Re-identification**: We do not attempt to reverse author hashes or correlate accounts across platforms.

6. **Responsible Publication**: Published findings aggregate data to prevent individual identification. Direct quotes are paraphrased.

7. **Data Retention**: Raw data is retained only for reproducibility. Users may request deletion of their hashed contributions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Data Models | Pydantic |
| Scraping | PRAW, Requests, BeautifulSoup |
| NLP | SpaCy, NLTK, BERTopic |
| Embeddings | sentence-transformers |
| Analysis | scikit-learn, NetworkX, iGraph |
| Visualization | Matplotlib, Plotly, React + D3 |
| Testing | pytest, hypothesis |

## License

MIT License — See LICENSE file for details.

## Citation

If you use this dataset or code in your research, please cite:

```bibtex
@software{occult_corpus_research,
  title={Occult Corpus Research: Computational Analysis of Online Esoteric Communities},
  author={Anonymous},
  year={2026},
  url={https://github.com/occult-kranti/occult-corpus-research}
}
```

## Contributing

Contributions are welcome. Please ensure:
- All code includes type hints and docstrings
- Tests pass (`pytest`)
- Code is formatted with `ruff`
- No PII or raw usernames are committed

---

*This project is for academic and research purposes only.*
