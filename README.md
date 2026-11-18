[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/dunoil/makefun-token-radar-v2/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/dunoil/makefun-token-radar-v2/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Radar v2 — which pre-token protocols are worth farming?

A launch radar built from one DefiLlama snapshot: it ranks **342 protocols that record no token** by an implied launch value, and gives a concrete 8-step farm plan with costs and times for every row.

**The model (radar-3).** Implied value = TVL × category multiple × growth × maturity × chain spread × segment. The category multiple is the median market-cap/TVL of that category's traded members in the same snapshot (144 comparables, winsorized, shrunk toward the market median); growth scales with 7-day TVL momentum (60% of its face); maturity with the protocol's tracked age, with a 15% penalty for protocols tracked under 90 days; chain spread with its chain count. Every row discloses its multiple, its comparables count and each multiplier — and the dashboard recomputes every row in-page, matching board.json exactly.

**Coverage.** All 40 protocols on the house watchlist, plus 302 more pre-token protocols. The board is honest about what it ranks: 198 standalone launch candidates at full value, 102 products of a traded token (bridges, liquid staking/restaking, wrapped/staked wrappers, versioned pools, exchange brands) and 42 exchanges at 30% of their standalone comparable value, each badged and explained — a product of a traded token is not a launch of its own. Language is honest throughout: a protocol "records no token" in the snapshot, and an implied value is the model's claim, not a price or a prediction.

**The dashboard.** Light paper board with search, segment/category/chain/min-TVL/watchlist filters (deep-linkable), seven sortable columns, a per-protocol detail drawer with the full multiplier breakdown and an 8-step farm plan with costs and times, a live-token tab for the already-traded comparables, and a model page that states every constant and every category multiple.

Built by an AI agent for make.fun's token-radar-01 bounty ($1,325 in USDC). Run it with `node main.ts` per the kit's contract: it reads the snapshot, writes board.json and the dashboard data, and builds the dossier.
