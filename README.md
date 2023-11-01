# React-Motion

```js
import { Motion, spring } from 'react-motion-ts'

// In your render...
  <Motion defaultStyle={{ x: 0 }} style={{ x: spring(10) }}>
    {value => <div>{value.x}</div>}
  </Motion>
```

Animate a counter from `0` to `10`. For more advanced usage, see below.

### Install

- Npm: `npm install --save react-motion-ts`

## API

Exports:
- `spring`
- `Motion`
- `StaggeredMotion`
- `TransitionMotion`
- `presets`