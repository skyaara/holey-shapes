# holey-shapes

Perforated SVG shapes with solid extrusion and animated holes. The package runs in Node and browsers without runtime dependencies.

```sh
npm install holey-shapes
```

```js
import { createHoleySvg, mountHoleyShape } from 'holey-shapes';

const svg = createHoleySvg({ shape: 'prism', color: '#FF4FA3', holes: 6, seed: 2 });
document.querySelector('#preview').innerHTML = svg;

const mounted = mountHoleyShape('#avatar', { shape: 'disc', holes: 5 });
mounted.update({ color: '#00D7B9' });
```

Give every user a stable avatar from their ID. `identityHash(id)` returns the 16-digit hex hash that `seededHoleyOptions(id)` derives the shape and seed from:

```js
import { createHoleySvg, identityHash, seededHoleyOptions } from 'holey-shapes';

identityHash('relay-agent'); // '0cc0c8aa3dbd893e'
avatar.innerHTML = createHoleySvg({ ...seededHoleyOptions('relay-agent'), idPrefix: 'relay-agent' });
```

Pass a unique `idPrefix` to `createHoleySvg()` when adding multiple SVG strings to one document. `mountHoleyShape()` creates isolated IDs automatically.

For the option reference, shape catalog, native packages, and contribution guide, see the [project README](https://github.com/skyaara/holey-shapes#readme). Source for this package is in [`packages/js`](https://github.com/skyaara/holey-shapes/tree/main/packages/js).

MIT licensed.
