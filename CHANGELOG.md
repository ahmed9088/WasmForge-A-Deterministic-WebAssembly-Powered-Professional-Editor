# Changelog

All notable changes to WasmForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-18

### Added
- **Command Palette** — `Ctrl+P` to search and execute commands
- **Keyboard Shortcuts Modal** — Press `?` to view all shortcuts
- **Context Menu** — Right-click on canvas or elements for quick actions
- **Duplicate Element** — `Ctrl+D` to duplicate the selected element
- **Lock/Unlock Elements** — Prevent accidental edits to finalized elements
- **Toggle Visibility** — Show/hide elements from the layer panel
- **Z-Order Reordering** — Move elements up/down, to front/back
- **Circle & Image Geometry Controls** — Edit center, radius, width, height in Property Inspector
- **Opacity Slider** — Visual slider with percentage display
- **Shadow Controls** — Blur, offset X/Y, and shadow color in Property Inspector
- **CI/CD Pipeline** — GitHub Actions for typecheck, build, and Rust tests
- **Dependabot** — Automated dependency updates for npm and cargo
- **Rate Limiting** — Auth routes protected against brute-force attacks
- **WebSocket Authentication** — JWT verification on WS connections
- **Health Check Endpoint** — `GET /health` for monitoring
- **CORS Middleware** — Proper cross-origin headers for frontend
- **PR Template** — Structured pull request template with checklists
- **Code of Conduct** — Contributor Covenant v2.1

### Changed
- **Undo/Redo** — Now uses deterministic reset + replay instead of broken no-op
- **JWT Secret** — Moved from hardcoded value to `JWT_SECRET` environment variable
- **Backend Error Handling** — Typed error responses with consistent format
- **Issue Templates** — Converted from Markdown to YAML with dropdown fields
- **Layer Panel** — Shape-specific icons, lock/visibility toggles, reorder buttons
- **Property Inspector** — Geometry controls for all shape types, not just Rect

### Fixed
- `LayerPanel` `el.shape.kind` bug — Fixed to use tagged-union shape detection
- Missing `sequence: 0` initialization in project creation
- Undo was a no-op in `ActionStore`, now properly resets and replays actions
- Undo/Redo buttons in header were not connected to handlers

## [1.0.0] - 2026-01-15

### Added
- Initial release with Rust WASM engine
- Deterministic fixed-point arithmetic (I48F16)
- React frontend with Cyber-Glass UI
- Canvas-based element rendering
- Rect, Circle, Image element types
- Animation timeline with keyframe support
- Real-time collaboration via WebSockets
- Custom cursor system
- Theme customization
- Engine preferences panel
- Snap guides and marquee selection
