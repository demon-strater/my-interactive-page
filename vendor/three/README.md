# Three.js r164 / 0.164.1

Locally hosted so the detailed Surrealism street has no runtime CDN dependency.

- `three.module.min.js`: https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.min.js
- `Reflector.js`: https://github.com/mrdoob/three.js/blob/r164/examples/jsm/objects/Reflector.js
- `LICENSE`: upstream MIT license, retained alongside the distribution.

The only change to the upstream Reflector is its import specifier: `three` becomes
`./three.module.min.js`. The scene-specific water shader is in `surrealism-street.js`.
