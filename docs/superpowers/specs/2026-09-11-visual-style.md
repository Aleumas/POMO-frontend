# POMO Visual Style

Teak-inspired, not Teak-copied. A calm neutral canvas with clean white cards, where
personality comes from two accent colors, fully-rounded shapes, and playful geometric
"confetti" that doubles as the sticker/achievement system.

## Principles

- **Calm surface, loud accents.** Workhorse surfaces (timer, cards) stay neutral so they
  never fight the content. Personality lives in accent color, rounded shapes, and stickers.
- **Two accents, otherwise grayscale.** Indigo = focus/primary actions. Amber = break /
  playful highlight. A muted red is reserved for destructive only.
- **Rounded and friendly.** Large radii, pill controls, soft geometric shapes.
- **Stickers are the confetti.** Decorative shapes on marketing pages are the same badges
  users earn in the app — one vocabulary, not throwaway decoration.

## Color tokens (see `tailwind.config.ts`)

| Token               | Hex       | Use                                    |
| ------------------- | --------- | -------------------------------------- |
| `canvas`            | `#F6F6F4` | Page background                        |
| `surface`           | `#FFFFFF` | Cards                                  |
| `ink`               | `#18181B` | Primary text                           |
| `ink-muted`         | `#6B7280` | Secondary text                         |
| `hairline`          | `#ECECEC` | Card borders                           |
| `accent-work`       | `#4F46E5` | Focus state, primary actions (indigo)  |
| `accent-work-tint`  | `#ECEBFC` | Pill/shape fills for focus             |
| `accent-break`      | `#F59E0B` | Break state, playful highlight (amber) |
| `accent-break-tint` | `#FDF0D5` | Pill/shape fills for break             |

## Type

- **Space Grotesk** for everything, including timer digits (`font-sans`, loaded in
  `layout.tsx`). Friendly geometric grotesk; digits use `tabular-nums`.
- `firaCode` demoted to small mono "legend" labels only (room code, timestamps).

## Shape & components

- **Radius:** cards ~24px (`rounded-3xl`), pills/buttons fully rounded.
- **Cards:** `bg-surface` + `border-hairline`, shadow only on hover.
- **Pills/tags:** tint background + optional dot/icon + label. Used for session state,
  room code, connection status, stats, levels.
- **Buttons:** primary = filled `accent-work` with white text; secondary = ghost/outline.
- **Stickers/achievements:** flat rounded geometric badges in accent + tint, icon inside.
- **Motion:** light and springy — small pop/scale on hover; the `Sticker` wobble fits here.

## Voice

Short, friendly, lightly playful. Discord-style microcopy ("break's over", "4 in a row").
Personality in words, not decoration.
