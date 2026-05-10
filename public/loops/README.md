# Cinematic Workflow Loops

Drop short (8–12s), muted, looping SaaS workflow animations here. The
homepage and marketing sections will pick them up automatically via
`src/components/media/WorkflowLoop.tsx` + the `LOOPS` registry.

## File naming convention

| Slot         | MP4 (H.264, ~1.5–3 MB)            | WebM (VP9, optional)              | Poster (JPG, 1280w)               |
|--------------|-----------------------------------|-----------------------------------|-----------------------------------|
| Hero         | `hero-workflow.mp4`               | `hero-workflow.webm`              | `hero-workflow.jpg`               |
| Exports      | `exports-delivery.mp4`            | `exports-delivery.webm`           | `exports-delivery.jpg`            |
| Workspace    | `workspace-flow.mp4`              | `workspace-flow.webm`             | `workspace-flow.jpg`              |
| Integrations | `integrations.mp4`                | `integrations.webm`               | `integrations.jpg`                |
| Mobile       | `mobile-async.mp4`                | `mobile-async.webm`               | `mobile-async.jpg`                |

## Encoding recommendations

- **Resolution**: 1920×1080 (16:9) for desktop slots, 1080×1920 (9:16) for mobile.
- **Duration**: 8–12 seconds, seamlessly loopable.
- **Codec**: H.264 high profile, CRF 22–24, faststart enabled.
- **Audio**: strip entirely (these autoplay muted).
- **Target size**: ≤ 3 MB per file.

Quick ffmpeg recipe:

```bash
ffmpeg -i input.mov -an -c:v libx264 -profile:v high -crf 23 \
  -movflags +faststart -pix_fmt yuv420p hero-workflow.mp4

ffmpeg -i input.mov -an -c:v libvpx-vp9 -b:v 1500k -row-mt 1 \
  hero-workflow.webm

ffmpeg -i input.mov -vframes 1 -q:v 4 hero-workflow.jpg
```

## Direction

Calm, operational, workflow-native. Think Linear / Stripe / Vercel —
**not** flashy ad reels. Stylized abstractions of dashboards, async
chips, exports and delivery — **never** literal product UI recordings.