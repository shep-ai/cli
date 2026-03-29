# Visual Assets for Marketing & Documentation

Created for Reddit campaign (DEV-12) and general marketing use.

## Demo GIF

**File:** `docs/demo.gif` (5.2MB)
**Duration:** ~60 seconds
**Resolution:** 1400x800px
**Description:** Terminal recording showing the full Shep CLI workflow from `npx @shepai/cli feat new` to merged PR

**Flow shown:**
1. Requirements gathering (AI conversation)
2. Technical specification generation
3. Implementation phase (6 tasks)
4. Testing & validation
5. PR creation

**Generated with:** VHS (vhs.charm.sh)
**Source:** `demo.tape`

**Usage:**
- Reddit posts (r/programming, r/sideproject, r/ExperiencedDevs)
- GitHub README
- Social media (Twitter, LinkedIn)
- Documentation

---

## Screenshots

### Cover Image
**File:** `docs/screenshots/cover.png` (291KB)
**Description:** Composite showing TUI and web dashboard in action
**Usage:** README hero image, social media cards

### Architecture Diagram
**File:** `docs/screenshots/architecture-diagram.png` (71KB)
**Source:** `docs/architecture-diagram.mmd` (Mermaid)
**Description:** Clean Architecture layers (domain → application → infrastructure → presentation)
**Usage:** Documentation, technical blog posts, Reddit technical discussions

---

## Asset Inventory

| Asset | File | Size | Purpose |
|-------|------|------|---------|
| Demo GIF | `docs/demo.gif` | 5.2MB | Full workflow demo |
| Cover screenshot | `docs/screenshots/cover.png` | 291KB | Hero image |
| Architecture diagram | `docs/screenshots/architecture-diagram.png` | 71KB | Technical documentation |
| Architecture source | `docs/architecture-diagram.mmd` | 1.9KB | Editable diagram |
| Demo tape source | `demo.tape` | - | VHS script for regenerating demo |

---

## Regenerating Assets

### Demo GIF

To regenerate the demo GIF:

```bash
# Install VHS if not already installed
brew install vhs

# Generate the GIF
vhs demo.tape

# Move to docs
mv demo.gif docs/demo.gif
```

### Architecture Diagram

To regenerate the architecture diagram:

1. Edit `docs/architecture-diagram.mmd`
2. Use Mermaid CLI or online editor (mermaid.live)
3. Export as PNG to `docs/screenshots/architecture-diagram.png`

---

## Notes

- Demo GIF is 5.2MB - consider optimizing for web if needed
- All assets are git-tracked and ready for use
- VHS tape file (`demo.tape`) is version-controlled for easy regeneration
- Architecture diagram uses Mermaid for easy editing and version control
