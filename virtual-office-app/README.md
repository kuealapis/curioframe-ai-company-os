# CurioFrame Virtual Office

A browser-based 3D office surface built with React, Three.js, React Three Fiber, and Drei. It is deployed as a static bundle under `/virtual-office/` and embedded by the authenticated CurioFrame Company OS.

## Architecture boundaries

- The parent Company OS remains responsible for Supabase authentication, row-level security, data loading, Realtime subscriptions, Founder approvals, and all write operations.
- This app does not contain Supabase credentials, service-role keys, AI-provider calls, task mutations, or publishing actions.
- The parent sends a read-only snapshot to the iframe using `postMessage`:
  - `curioframe:office-snapshot`: employees, tasks, and departments.
  - `curioframe:office-ready`: sent by this app when its message listener is ready.
  - `curioframe:agent-selected`: sent by this app when the Founder selects an Agent in the 3D scene.
  - `curioframe:select-agent`: sent by the parent to focus an Agent selected elsewhere in Mission Control.
- Messages are accepted only from the same origin. The parent also verifies the iframe's `contentWindow` before accepting responses.

## Visual status mapping

- `in_progress` task or `working` employee: Agent works at their department desk.
- `review` task: Agent walks to the meeting room.
- `blocked` task or `error` employee: Agent walks to the lounge/support area.
- `queued`, `planned`, and `ready`: Agent remains at their assigned desk.
- These are visual representations of persisted records; they do not start or execute work.

## Local development

From this directory:

```bash
npm install
npm run build
```

The Vite build writes static output to the repository's `virtual-office/` directory. GitHub Actions builds the bundle before publishing GitHub Pages.

## Third-party attribution

See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for the MIT attribution associated with the Ruang project that informed the visual direction.

## Navigation

- Orbit mode: mouse drag or one-finger drag rotates the camera; pinch zooms and two-finger drag pans.
- Walk mode: mouse or finger drag looks around; WASD or arrow keys move the camera on desktop.
- The on-screen joystick sends forward/back and strafe movement on touch devices; Q/E change floor on a keyboard.
- The parent Mission Control toolbar controls orbit/walk mode, zoom, and reset through the same-origin iframe message bridge.
