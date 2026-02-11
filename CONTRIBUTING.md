# Contributing to WasmForge

Thank you for your interest in contributing to WasmForge! We welcome all contributions that help make this deterministic media studio even better.

## How to Contribute

1.  **Fork the repository**.
2.  **Clone your fork**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/WasmForge.git
    ```
3.  **Create a branch** for your feature or bugfix:
    ```bash
    git checkout -b feature/amazing-feature
    ```
4.  **Make your changes** and ensure tests pass:
    ```bash
    npm run test:engine
    ```
5.  **Commit your changes** following [Conventional Commits](https://www.conventionalcommits.org/):
    ```bash
    git commit -m "feat: add support for lottie animations"
    ```
6.  **Push to your fork** and **Submit a Pull Request**.

## Technical Standards

- **Rust**: All core logic must be deterministic and use fixed-point math where applicable.
- **Frontend**: Follow the Cyber-Glass UI design system. Use Vanilla CSS for new components.
- **Testing**: Every new engine feature requires a corresponding test in `engine/src/lib.rs` or `engine/src/core/`.

## Code of Conduct

Please be respectful and professional in all interactions within this project.

---
*WasmForge - Forge your vision with the power of WebAssembly.*
