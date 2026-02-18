## Description

<!-- Brief description of the changes. What does this PR do? -->

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature that would break existing functionality)
- [ ] 📝 Documentation (changes to docs only)
- [ ] ♻️ Refactor (code change that neither fixes a bug nor adds a feature)
- [ ] 🔧 DevOps (CI/CD, build system, dependencies)

## Related Issues

<!-- Link related issues: Fixes #123, Closes #456 -->

## Changes Made

<!-- List the main changes made in this PR -->

- 

## Screenshots / Recordings

<!-- If applicable, add screenshots or recordings -->

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have added tests that prove my fix works or my feature functions
- [ ] New and existing tests pass with my changes
- [ ] I have updated documentation as needed
- [ ] I have checked for potential determinism issues (no floating-point in engine)

## Engine-Specific (if applicable)

- [ ] All arithmetic uses `I48F16` fixed-point types
- [ ] No `f32`/`f64` operations in the core engine
- [ ] WASM bindings are properly serialized with `serde`
