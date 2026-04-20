---
name: github-pages-media-dependency-fix
description: Diagnose and fix broken local media assets for static sites deployed via GitHub Pages.
version: 1.0.0
scope: workspace
---

# GitHub Pages Media Dependency Fix

Use this skill when images, icons, or CSS media files load locally but fail after deploying to GitHub Pages.

## Outcome

Make all required media assets load correctly in production GitHub Pages builds.

## Inputs

- Site source directory (for example `docs/`)
- Current media directory location (for example `Media/`)
- Deployment mode:
  - Pages source is root
  - Pages source is `docs/`

## Workflow

1. Locate media path usage
- Search HTML, CSS, and JS for media path patterns.
- Capture all variants such as `../Media/`, `./Media/`, `/Media/`, and case differences.

2. Verify deployable asset location
- Check where GitHub Pages publishes from.
- If source is `docs/`, ensure media files are inside `docs/` (or another published path).

3. Normalize file/folder naming
- Ensure path casing in code exactly matches folder names and filenames.
- Prefer consistent `Media/` or `media/` naming across all files.

4. Resolve path references
- Convert references to be valid from each file's location.
- For same-level HTML files under `docs/`, use `Media/<file>`.
- For CSS files in `docs/`, use `Media/<file>`.
- Avoid host-root assumptions unless intentionally configured.

5. Copy or move assets into published scope
- If media sits outside the publish directory, copy or move it into the publish directory.
- Preserve filenames to avoid breaking existing references.

6. Validate all references
- Re-scan for stale patterns (for example leftover `../Media/`).
- Confirm every referenced local media file exists.

7. Review deployment-specific risks
- Check for mixed-content issues (HTTP assets on HTTPS page).
- Check for hardcoded localhost URLs in frontend code.

## Decision Points

- If Pages source is `docs/` and media is outside `docs/`:
  - Copy/move media into `docs/Media/`
  - Update all references to published-relative paths
- If Pages source is root:
  - Keep assets under root and use root-correct relative paths
- If naming mismatch exists (`Media` vs `media`):
  - Rename paths or folder to match exactly (case-sensitive behavior on Linux/CDN)

## Completion Checks

- No leftover stale media prefixes that point outside published content.
- All media referenced in HTML/CSS resolves to existing files.
- Site icons and hero/background images load in the deployed URL.
- No console/network 404 for local media assets.

## Example Prompts

- "Run the GitHub Pages media dependency fix skill for this repo."
- "Our images load locally but not on GitHub Pages. Apply the media dependency workflow."
- "Normalize all media paths for docs-based GitHub Pages deployment."
