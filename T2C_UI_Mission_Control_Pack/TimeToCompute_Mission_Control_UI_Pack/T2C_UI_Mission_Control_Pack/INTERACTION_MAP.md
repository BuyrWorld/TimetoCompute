# Homepage Interaction Map

Use the existing router and existing canonical paths where they already exist. The suggested paths below are fallbacks, not permission to create duplicate routes.

| Homepage element | Required behaviour | Suggested destination/state |
|---|---|---|
| T2C logo | Return to Mission Control | `/` |
| Today | Open Mission Control and show active nav state | `/` |
| Companies | Open searchable company directory | `/companies` |
| Sites | Open searchable site map/directory | `/sites` |
| Intelligence | Open finite intelligence/signal feed | `/intelligence` |
| Search / command control | Open command palette | In-place dialog |
| User control | Open account/preferences menu | In-place menu |
| Live / Focus | Switch interface mode and persist preference | In-place state + local persistence |
| Show Me What Changed | Show changes since the user's last recorded visit | `/intelligence?view=since-last-visit` |
| Milestones advanced | Filter to positive delivery-stage changes | `/intelligence?change=advanced` |
| Deadlines slipped | Filter to slippage and risk changes | `/intelligence?change=slipped` |
| New contract | Open the relevant contract or filtered contracts view | Canonical contract route or `/intelligence?change=contract` |
| Infrastructure map background | Open Sites explorer | `/sites` |
| Map site hotspot | Open that individual site | Existing canonical site route |
| Map vehicle/event | Open a concise popover; its CTA opens the related evidence/site | In-place popover → canonical route |
| Watchlist company row | Open company intelligence page | Existing canonical company route |
| Watch/unwatch control | Update watchlist with optimistic feedback and rollback on failure | In place |
| View all watchlist | Open company directory filtered to watched | `/companies?filter=watching` |
| Daily signal progress nodes | Open corresponding signal without losing progress | In-place drawer or canonical signal route |
| View All Signals | Open full finite daily set | `/intelligence?view=today` |

## Universal button behaviour

- If an element looks pressable, it must perform a real action.
- Use semantic links for navigation and semantic buttons for in-place actions.
- Cards may be fully clickable, but nested actions must not trigger the card route.
- Pointer, Enter and Space activation all receive the same short lime click-glow.
- `aria-current="page"` marks the active navigation destination.
- Loading operations show immediate pending feedback and prevent accidental double submission.
- Disabled controls state why they are unavailable; they must not look active.
- Route changes happen immediately. Never hold a user on the page just so the glow animation can finish.

