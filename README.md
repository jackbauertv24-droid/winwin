# Winwin Project

## Project Overview

This project involves GitHub repository setup and web scraping of Hong Kong Jockey Club Mark Six lottery results with automated weekly updates via GitHub Actions.

---

## Version History

| Version | Tag | Date | Changes |
|---------|-----|------|---------|
| 1.0.0 | `v1.0.0` | 2026-03-20 | Initial scraper - 10 draws |
| 1.1.0 | `v1.1.0` | 2026-03-20 | Added Draw Number=30 option - 30 draws |
| 1.2.0 | `v1.2.0` | 2026-03-20 | GitHub Actions automation with timestamped results |
| 1.2.1 | `v1.2.1` | 2026-03-20 | Documentation and README update |

---

## GitHub Repository Setup

### Connection Status

| Property | Value |
|----------|-------|
| Account | jackbauertv24-droid |
| Repository | [winwin](https://github.com/jackbauertv24-droid/winwin) |
| Protocol | SSH |
| Remote URL | `git@github.com:jackbauertv24-droid/winwin.git` |
| Branch | `main` |

### Setup Commands

```bash
# Initialize git
git init

# Create and connect remote repository
gh repo create winwin --public --source=. --remote=origin

# Rename branch to main
git branch -m master main
```

### Whitelist-based Git Tracking

The `.gitignore` uses a whitelist approach - ignore everything by default, explicitly allow specific files:

```gitignore
*
!.gitignore
!fetch-marksix.mjs
!.github/
!.github/workflows/
!.github/workflows/*.yml
!results/
!results/*
!package.json
```

---

## Mark Six Results Scraper

### Target URL

https://bet.hkjc.com/en/marksix/results

### Challenge

The HKJC Mark Six results page is a React Single Page Application (SPA) with:
- Client-side rendering
- JavaScript-required content
- Anti-bot detection mechanisms

### Solution

Used **Playwright** with anti-detection techniques to successfully scrape the lottery results.

### Anti-Detection Techniques Used

1. **Browser Launch Options**
   - `--disable-blink-features=AutomationControlled` - Hides automation
   - `--disable-infobars` - Removes info bars
   - `--no-sandbox` - Disables sandbox for containerized environments

2. **Context Configuration**
   - Real Chrome User Agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...`
   - Locale: `en-US`
   - Timezone: `Asia/Hong_Kong`
   - Desktop viewport: `1920x1080`

3. **JavaScript Injections**
   ```javascript
   // Hide webdriver property
   Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
   
   // Fake plugins array
   Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
   
   // Set languages
   Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
   
   // Add chrome.runtime object
   window.chrome = { runtime: {} };
   ```

4. **Wait Strategy**
   - `waitUntil: 'networkidle'` - Wait for network to settle
   - Additional delays for dynamic content loading

### Scraper Features (v1.2.0)

| Feature | Description |
|---------|-------------|
| Draw Number Selection | Configurable dropdown (default: 30 draws) |
| Search Trigger | Automatically clicks Search button |
| Result Extraction | Parses DOM for draw IDs, dates, numbers |
| Output Format | JSON with structured data |

---

## GitHub Actions Automation

### Workflow Configuration

**File:** `.github/workflows/scrape.yml`

| Property | Value |
|----------|-------|
| Schedule | Every Sunday at 02:00 UTC (`cron: '0 2 * * 0'`) |
| Manual Trigger | Yes (`workflow_dispatch`) |
| Permissions | `contents: write` |

### Workflow Steps

```yaml
1. Checkout repository
2. Setup Node.js 22
3. Install dependencies (npm install)
4. Install Playwright Chromium
5. Run scraper (node fetch-marksix.mjs)
6. Timestamp results
7. Commit and push results back to repo
```

### Timestamping Strategy

Results are timestamped with datetime format to prevent duplicates:

```
results/
├── marksix-2026-03-20-062918.json
├── marksix-2026-03-27-020034.json
└── history.jsonl
```

**Filename format:** `marksix-YYYY-MM-DD-HHMMSS.json`

**history.jsonl** (append-only log):
```json
{"scrapedAt": "2026-03-20T06:29:18Z", "file": "marksix-2026-03-20-062918.json"}
{"scrapedAt": "2026-03-27T02:00:34Z", "file": "marksix-2026-03-27-020034.json"}
```

### Triggering the Workflow

```bash
# Manual trigger via CLI
gh workflow run scrape.yml

# View workflow status
gh run list --limit 5

# View run logs
gh run view <run-id> --log
```

---

## Project Files

```
winwin/
├── .github/
│   └── workflows/
│       └── scrape.yml           # GitHub Actions workflow
├── results/
│   ├── .gitkeep
│   ├── history.jsonl            # Log of all scrapes
│   └── marksix-*.json           # Timestamped result files
├── .gitignore                   # Whitelist-based ignore
├── fetch-marksix.mjs            # Playwright scraper script
├── package.json                 # Node.js dependencies
└── README.md                    # This file
```

| File | Description |
|------|-------------|
| `fetch-marksix.mjs` | Playwright scraper script |
| `.github/workflows/scrape.yml` | GitHub Actions automation |
| `results/history.jsonl` | Append-only log of all scrapes |
| `results/marksix-*.json` | Timestamped lottery results |
| `package.json` | Node.js project configuration |

---

## Dependencies

```json
{
  "dependencies": {
    "playwright": "^1.58.2"
  }
}
```

### Installation

```bash
npm install
npx playwright install chromium
```

### Run Scraper Locally

```bash
node fetch-marksix.mjs
```

---

## Key Findings

### 1. SPA Detection
The page returns minimal HTML without JavaScript execution. Tools like `curl` or basic HTTP fetchers cannot access the content.

### 2. Number Representation
Ball numbers are rendered as SVG images with `alt` attributes containing the number value:
```html
<img src="/static/media/marksix-2.894ce8a2.svg" alt="2">
```

### 3. DOM Structure
Results are in `.table-row` elements with:
- `.cell-id a` - Draw ID
- `.cell-date` - Date
- `.cell-sbName` - Snowball type (if applicable)
- `.cell-ball-list img[alt]` - Ball number images

### 4. No Authentication Required
The results page is publicly accessible without login.

### 5. NPM Registry Issue
Local npm was configured with Tencent mirror (`mirrors.tencentyun.com`) which is not accessible on GitHub Actions. Fixed by explicitly setting registry:
```yaml
npm config set registry https://registry.npmjs.org
```

### 6. GitHub Actions Permissions
Required `permissions: contents: write` for the workflow to push commits back to the repository.

### 7. Timestamp Uniqueness
Using date-only timestamps (`marksix-2026-03-20.json`) causes duplicates if workflow runs multiple times per day. Changed to datetime format (`marksix-2026-03-20-062918.json`).

---

## Data Structure

### Single Draw Result

```json
{
  "drawId": "26/030",
  "date": "19/03/2026",
  "sbName": "",
  "mainNumbers": [2, 6, 8, 33, 41, 45],
  "extraNumber": 48
}
```

### Special Draw Types

| Code | Name |
|------|------|
| TUS | Lucky Tuesday Snowball |
| CNY | Year of the Horse Snowball |

---

## Environment

- Node.js: v22.22.0
- Playwright: 1.58.2
- Platform: Linux
- Last Updated: 2026-03-20

---

## Quick Reference

```bash
# Clone repository
git clone git@github.com:jackbauertv24-droid/winwin.git

# Install dependencies
npm install

# Run scraper locally
node fetch-marksix.mjs

# Trigger GitHub Action manually
gh workflow run scrape.yml

# Check workflow status
gh run list --limit 5

# View tags
git tag -l

# Checkout specific version
git checkout v1.2.0
```
