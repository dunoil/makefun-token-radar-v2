// Token Radar v2 — the model (radar-3): one sealed snapshot in, one ranked board out.
//
// The board ranks every protocol in the snapshot that records no token (342 of 758), in three
// segments the dashboard shows separately and the model scores differently:
//
//   launch    a standalone protocol that records no token and is not a product of a traded one:
//             the launch candidates. 198 rows, every one of the house watchlist's 40 among them.
//   product   a bridge, liquid staking or restaking product, a wrapped or staked wrapper, a
//             versioned pool, or an exchange house brand: it records no token, but it is the
//             product of a token that already trades, so it is scored at 30% of its standalone
//             comparable value and badged as such. 102 rows.
//   exchange  a centralised exchange that records no token, scored at the same 30% for the same
//             reason: an exchange token would share value with the exchange itself. 42 rows.
//
// Protocols whose token already trades (416) are never ranked: they are the comparables the model
// is built from, and the dashboard shows the largest of them at the market's own values.
//
// Implied value is a comparables model, and every figure in it comes from the snapshot itself:
//
//   multiple   the median market-cap / TVL ratio of the protocols in the same category whose token
//              already trades, each ratio first clamped to [0.02, 5] so one outlier cannot carry a
//              category, then shrunk toward the whole market's median with weight SHRINK_WEIGHT, so
//              a category with two traded members leans on the market and one with fifteen stands
//              alone. A category with no traded member takes the market median outright.
//   base       = tvl_usd x multiple
//   growth     = 1 + clamp(change_7d, -60, 120) / 100 x 0.6   (a hot week is worth 60% of its face;
//              a protocol with no reported 7-day change scores neutral)
//   maturity   = 0.65 + 0.35 x min(age_days, 1460) / 1460, times 0.85 when the protocol has been
//              tracked under 90 days (young and unproven), and an unrecorded age scores the
//              snapshot's own median age
//   spread     = 1 + 0.015 x min(chains - 1, 8)               (each extra chain, up to eight, adds a
//              little: the same product already distributed is likelier to be valued as one network)
//   segment    = 1.00 for launch, 0.30 for product and exchange (see above)
//   implied    = clamp(round(base x growth x maturity x spread x segment), 1, 100000000000000)
//
// No protocol name is ever special-cased: the same function scores every row, and each row carries
// the multiple it was scored with, the number of traded comparables behind it and every multiplier,
// so a reader can rebuild every number on the board from the snapshot alone. An implied value is
// this model's claim about what a launch would be worth if the protocol's record stayed as it is;
// it is not a prediction that a token will be issued, and a protocol here records no token, which
// is not proof it has none.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  ratio_floor: number;
  ratio_cap: number;
  shrink_weight: number;
  growth_floor: number;
  growth_cap: number;
  growth_weight: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  young_age_days: number;
  young_penalty: number;
  chain_step: number;
  chain_max_extra: number;
  segment_haircut: number;
}

export const MODEL: ModelConstants = {
  ratio_floor: 0.02,
  ratio_cap: 5,
  shrink_weight: 4,
  growth_floor: -60,
  growth_cap: 120,
  growth_weight: 0.6,
  maturity_floor: 0.65,
  maturity_range: 0.35,
  maturity_days: 1460,
  young_age_days: 90,
  young_penalty: 0.85,
  chain_step: 0.015,
  chain_max_extra: 8,
  segment_haircut: 0.3,
};

/** The model's version label: the dashboard names it and the board carries it. */
export const MODEL_VERSION = 'radar-3';

/** Which segment of the board a pre-token protocol belongs to. */
export type Segment = 'launch' | 'product' | 'exchange';

/** How many live-token protocols the dashboard's Live token view carries, by market cap. */
export const LIVE_ROWS = 36;

/** One category's multiple: the value the model used, and how many traded protocols stand behind it. */
export interface CategoryMultiple {
  category: string;
  multiple: number;
  comparables: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  segment: Segment;
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    comparables: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    segment_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, carrying the exact farm plan board.json holds. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  segment: Segment;
  watchlist: boolean;
  implied_value_usd: number;
  category_multiple: number;
  comparables: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  segment_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  symbol: string | null;
}

/** Everything the dashboard needs: the board, the live set, the multiples table and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  global_multiple: number;
  median_age_days: number;
  multiples: CategoryMultiple[];
  watchlist_size: number;
  board_size: number;
  segment_sizes: Record<Segment, number>;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const bySlugAsc = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list of numbers. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A whole word in a name that marks the protocol as a wrapped or staked product of another asset. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** The exchange names a product may begin with: such a product is the exchange's, not a launch to come. */
const EXCHANGE_HEADS = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/**
 * The categories that are products of a token that already trades, never a launch of their own: a
 * bridge moves someone else's asset, a liquid staking or restaking product wraps a staked asset, and
 * restaked BTC wraps Bitcoin. The house's watchlist rule sets them aside for the same reason; the
 * board applies it at every size, not only above the floor.
 */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC']);

/** Which segment a pre-token protocol belongs to; a protocol that already trades has none. */
export function segmentOf(p: SnapshotProtocol): Segment | null {
  if (!isPreToken(p)) return null;
  if (p.category === 'CEX') return 'exchange';
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return 'product';
  if (VERSIONED.test(p.name)) return 'product';
  if (WRAPPED_WORD.test(p.name)) return 'product';
  if (EXCHANGE_HEADS.some((head) => p.name.startsWith(head))) return 'product';
  return 'launch';
}

/**
 * The comparables table: for every category the board uses, the multiple the model scores it with.
 * Ratios are clamped before any median is taken; a category's own median is then shrunk toward the
 * market median in proportion to how few traded protocols stand behind it, and a category with no
 * traded protocol at all takes the market median outright.
 */
export function categoryMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): { table: Map<string, CategoryMultiple>; globalMultiple: number } {
  const clampRatio = (p: SnapshotProtocol): number => Math.min(model.ratio_cap, Math.max(model.ratio_floor, p.mcap_usd! / p.tvl_usd));
  const traded = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.tvl_usd > 0);
  const globalMultiple = round4(median(traded.map(clampRatio)));
  const ratiosByCategory = new Map<string, number[]>();
  for (const p of traded) {
    const key = p.category ?? '';
    const list = ratiosByCategory.get(key) ?? [];
    list.push(clampRatio(p));
    ratiosByCategory.set(key, list);
  }
  const table = new Map<string, CategoryMultiple>();
  const categories = new Set(snapshot.protocols.filter((p) => segmentOf(p) !== null).map((p) => p.category ?? ''));
  for (const category of categories) {
    const ratios = ratiosByCategory.get(category) ?? [];
    if (ratios.length === 0) {
      table.set(category, { category, multiple: globalMultiple, comparables: 0 });
    } else {
      const own = median(ratios);
      const shrunk = (ratios.length * own + model.shrink_weight * globalMultiple) / (ratios.length + model.shrink_weight);
      table.set(category, { category, multiple: round4(shrunk), comparables: ratios.length });
    }
  }
  return { table, globalMultiple };
}

/** The snapshot's median recorded age in days: the age an unrecorded protocol is scored with. */
export function medianAgeDays(snapshot: Snapshot): number {
  const ages = snapshot.protocols.map((p) => ageDays(snapshot.as_of, p.listed_at)).filter((a): a is number => a !== null);
  return Math.round(median(ages));
}

/** The five multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiple: CategoryMultiple,
  medianAge: number,
  segment: Segment,
  model: ModelConstants = MODEL,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; segmentMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, finite(protocol.change_7d, 0)));
  // The multipliers are rounded before they are multiplied, so the dashboard's in-page recompute
  // from the stored (rounded) figures reproduces the implied value exactly.
  const growthMult = round4(1 + (growthPct / 100) * model.growth_weight);
  const ageForModel = age ?? medianAge;
  let maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  if (ageForModel < model.young_age_days) maturityMult *= model.young_penalty;
  maturityMult = round4(maturityMult);
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), model.chain_max_extra);
  const chainMult = round4(1 + extraChains * model.chain_step);
  const segmentMult = segment === 'launch' ? 1 : model.segment_haircut;
  const implied = Math.min(100_000_000_000_000, Math.max(1, Math.round(protocol.tvl_usd * multiple.multiple * growthMult * maturityMult * chainMult * segmentMult)));
  return { implied, growthPct, growthMult, maturityMult, chainMult, segmentMult, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const { table } = categoryMultiples(snapshot, model);
  const medianAge = medianAgeDays(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const scored = snapshot.protocols
    .map((p) => ({ p, segment: segmentOf(p) }))
    .filter((s): s is { p: SnapshotProtocol; segment: Segment } => s.segment !== null)
    .map(({ p, segment }) => {
      const multiple = table.get(p.category ?? '')!;
      const v = impliedValue(p, snapshot.as_of, multiple, medianAge, segment, model);
      return { p, segment, multiple, ...v };
    });
  scored.sort((a, b) => b.implied - a.implied || bySlugAsc(a.p.slug, b.p.slug));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    segment: s.segment,
    watchlist: watchlist.has(s.p.slug),
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.multiple.multiple,
      comparables: s.multiple.comparables,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      segment_multiplier: s.segmentMult,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age, s.segment).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 500;
  if (p.tvl_usd >= 1_000_000_000) return 250;
  if (p.tvl_usd >= 250_000_000) return 150;
  if (p.tvl_usd >= 50_000_000) return 100;
  if (p.tvl_usd >= 10_000_000) return 75;
  return 50;
}

/** One network transaction's fee on the protocol's first chain, in round dollars. */
function gasFor(chain: string): number {
  if (chain === 'Ethereum') return 12;
  if (chain === 'Bitcoin') return 6;
  if (chain === 'Solana') return 1;
  return 3;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 45;
  if (age < 180) return 60;
  if (age < 365) return 45;
  if (age < 730) return 35;
  return 30;
}

/** The category family's three moves: the main position, a second position, and the weekly action. */
interface FarmMoves {
  main: string;
  second: string;
  weekly: string;
}

function movesFor(p: SnapshotProtocol, capital: number, chain: string): FarmMoves {
  const c = (p.category ?? '').toLowerCase();
  const n = p.name;
  const half = Math.round(capital / 2);
  const fifth = Math.round(capital / 5);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('uncollateral'))
    return {
      main: `Supply $${capital} of USDC to ${n} on ${chain} and leave the deposit earning.`,
      second: `Borrow $${half} of USDC against the deposit at a conservative health factor and redeposit it once, so the wallet shows both sides of the market.`,
      weekly: `Repay a slice of the borrow and borrow it again, keeping the health factor comfortably safe.`,
    };
  if (c.includes('dex') || c.includes('liquidity'))
    return {
      main: `Provide $${capital} split evenly across both sides of ${n}'s busiest pool on ${chain}.`,
      second: `Route $${half} of ordinary swaps through ${n} itself rather than an aggregator, so the volume is the protocol's own.`,
      weekly: `Make two or three small swaps through ${n} and rebalance the pool position if it drifts out of range.`,
    };
  if (c.includes('curator') || c.includes('allocator'))
    return {
      main: `Deposit $${capital} into the largest ${n} vault on ${chain} and keep the vault shares in the wallet.`,
      second: `Split a second $${half} into a different ${n} vault on another chain it curates, so the wallet appears in more than one of its markets.`,
      weekly: `Move a small slice between two ${n} vaults, which keeps the wallet active in its allocation record.`,
    };
  if (c.includes('yield') || c.includes('farm'))
    return {
      main: `Deposit $${capital} of USDC into ${n}'s highest-TVL vault on ${chain} and keep the vault shares in the wallet.`,
      second: `Ladder a second $${half} into a different ${n} vault or strategy, so the wallet is not riding on one pool.`,
      weekly: `Harvest the week's yield and redeposit it into the same vault, which compounds the position and refreshes the activity record.`,
    };
  if (c.includes('bridge'))
    return {
      main: `Bridge $${capital} of USDC from Ethereum to ${chain} through ${n} and use the bridged funds in the destination app.`,
      second: `Bridge $${half} back a week later rather than the same day, so both directions sit in separate weekly snapshots.`,
      weekly: `Send one small transfer of $${fifth} through ${n} on a route you have not used before.`,
    };
  if (c.includes('staking') || c.includes('restak') || c.includes('anchor') || c.includes('decentralized btc'))
    return {
      main: `Stake $${capital} of the chain's staking asset through ${n} and keep the liquid receipt in the wallet.`,
      second: `Use half the receipt as collateral or in a pool where ${n} itself lists it, so the position counts twice in its ecosystem.`,
      weekly: `Add a small top-up of $${fifth} to the stake rather than opening a second wallet.`,
    };
  if (c.includes('derivative') || c.includes('perpetual') || c.includes('options') || c.includes('synthetic') || c.includes('interest rate'))
    return {
      main: `Deposit $${capital} of USDC as margin on ${n} and open one small hedged position, long and short in equal size.`,
      second: `Post $${half} into ${n}'s liquidity or vault side if it has one, which earns without a directional bet.`,
      weekly: `Roll the hedge once: close it and reopen it at the new price, keeping the size small and the margin topped up.`,
    };
  if (c.includes('basis'))
    return {
      main: `Deposit $${capital} of USDC into ${n}'s basis vault on ${chain} and keep the shares.`,
      second: `Hold the matching spot asset in the same wallet, so your position mirrors the trade ${n} itself runs.`,
      weekly: `Add $${fifth} to the vault and check the funding-rate page it publishes.`,
    };
  if (c.includes('rwa'))
    return {
      main: `Mint $${capital} of ${n}'s yield-bearing asset on ${chain} after its onboarding and hold the asset in the wallet.`,
      second: `Supply half the minted asset as collateral where ${n} lists it, or hold a second, smaller tranche with a different maturity.`,
      weekly: `Accrue one more small mint of $${fifth} rather than moving the whole position at once.`,
    };
  if (c.includes('stable') || c.includes('algo'))
    return {
      main: `Mint or deposit $${capital} of the stable asset through ${n} on ${chain} and hold it unspent.`,
      second: `Provide $${half} of the stable asset to the pool ${n} names as its main liquidity venue.`,
      weekly: `Swap a small amount into the stable asset and back through ${n}'s own interface.`,
    };
  if (c === 'chain')
    return {
      main: `Bridge $${capital} of USDC onto ${n}'s chain and hold it in the wallet as a native balance.`,
      second: `Pay real fees on the chain: deploy a trivial contract or run $${half} of transfers and swaps in its own apps.`,
      weekly: `Make a handful of ordinary transactions on the chain each week, spread across different days.`,
    };
  if (c.includes('prediction'))
    return {
      main: `Fund $${capital} and take a position in ${n}'s most liquid market, on the side you actually believe.`,
      second: `Add a standing limit order $${half} in size on a second market, so the wallet also provides liquidity.`,
      weekly: `Settle or roll one position and open one new one in a market that resolves this month.`,
    };
  if (c.includes('insurance'))
    return {
      main: `Buy $${capital} of cover from ${n} on ${chain} for a position you really hold, and keep the policy to expiry.`,
      second: `Stake $${half} into ${n}'s underwriting pool if it offers one, which is the side a launch rewards first.`,
      weekly: `Renew or extend one small policy rather than letting cover lapse entirely.`,
    };
  if (c.includes('launchpad'))
    return {
      main: `Deposit $${capital} into ${n}'s current sale or staking tier on ${chain} and complete its participation steps.`,
      second: `Take part in one launch end to end: commit, claim and hold the allocation instead of selling on day one.`,
      weekly: `Check the launch calendar and register for the next sale before its snapshot date.`,
    };
  if (c.includes('payment') || c.includes('card'))
    return {
      main: `Move $${capital} through ${n} as a real payment or balance and leave it sitting in the account.`,
      second: `Make one payment to a second wallet you control through ${n}, so both sending and receiving show.`,
      weekly: `Run one ordinary payment a week rather than a single large one.`,
    };
  if (c.includes('privacy'))
    return {
      main: `Deposit $${capital} of USDC into ${n}'s shielded pool on ${chain} through its own interface.`,
      second: `Withdraw half to a second wallet you control after a few days, completing a full private round trip.`,
      weekly: `Add one small shielded transfer of $${fifth}.`,
    };
  if (c === 'cex')
    return {
      main: `Open a ${n} account under your own name, pass its verification, and deposit $${capital} of USDC.`,
      second: `Trade $${half} of spot volume across two different pairs, and keep the remaining balance on the account for a month.`,
      weekly: `Place one small spot trade a week and keep the account funded, so the history reads as a real user.`,
    };
  return {
    main: `Deposit $${capital} of USDC into ${n} on ${chain} and keep the position open.`,
    second: `Make one further $${half} deposit a week later from the same wallet, so the record shows a returning user.`,
    weekly: `Make one qualifying action, such as a deposit, a swap or a vote in ${n}'s own interface.`,
  };
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age, segment), never from a hand-written
 * list of names. Product and exchange rows farm the product itself and say so: the plan earns a
 * position in the product, and any token it could ever pay would come from its parent, not from a
 * launch of its own.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null, segment: Segment): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const gas = gasFor(chain);
  const hold = holdDaysFor(age);
  const moves = movesFor(p, capital, chain);
  const totalFees = gas * 6;
  const segmentNote =
    segment === 'launch'
      ? `This row is a launch candidate: the plan below farms ${p.name} itself.`
      : segment === 'product'
        ? `This row is a product of a token that already trades, not a launch of its own: the plan below farms the product, and any reward would come from its parent token's ecosystem.`
        : `This row is an exchange that records no token: the plan below builds a real account history, and any reward would be the exchange's own decision, not a protocol launch.`;
  return [
    {
      text: `Open a fresh wallet for this farm, keep its seed phrase offline, and fund it only with what this plan uses. ${segmentNote}`,
      cost: 'no fee beyond the first funding transaction',
      time: '10 minutes',
    },
    { text: moves.main, cost: `$${capital} of capital and about $${gas} of network fees`, time: '15 minutes to set up' },
    { text: moves.second, cost: `about $${Math.max(1, Math.round(gas / 2))} of network fees beyond the amount named`, time: '10 minutes' },
    {
      text: `Open ${p.name}'s own points or rewards page, connect the same wallet and confirm the position shows as counted; save a screenshot of it in your farm log.`,
      cost: 'free to check, and never pay anyone to claim on your behalf',
      time: '5 minutes',
    },
    { text: moves.weekly, cost: `about $${Math.max(1, Math.round(gas / 2))} of network fees a week`, time: '10 minutes a week' },
    {
      text: `Keep the position untouched for at least ${hold} days, across at least two weekly snapshots, so the activity reads as use and not a one-day visit.`,
      cost: `the $${capital} stays committed, and its price and smart-contract risk are yours`,
      time: `${hold} days`,
    },
    {
      text: `Budget the whole farm before you start: about $${totalFees} of network fees across the six transactions above, plus the $${capital} of capital, and never farm with money you need back on a date.`,
      cost: `about $${totalFees} of fees in total, on top of the $${capital} of capital`,
      time: '5 minutes to plan',
    },
    {
      text: `Write every transaction hash and date in a farm diary; before withdrawing, re-check the points page and ${p.name}'s own announcements for a snapshot or claim window, and claim only from the link the protocol itself publishes.`,
      cost: 'nothing but the diary',
      time: '5 minutes a week',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      symbol: p.symbol,
    }));
}

/** A board row's compact form for data.js, carrying the exact farm plan board.json holds. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    segment: row.segment,
    watchlist: row.watchlist,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    comparables: row.model.comparables,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    segment_multiplier: row.model.segment_multiplier,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const { table, globalMultiple } = categoryMultiples(snapshot, model);
  const multiples = [...table.values()]
    .filter((m) => board.some((r) => (r.category ?? '') === m.category))
    .sort((a, b) => b.multiple - a.multiple || bySlugAsc(a.category, b.category))
    .map((m) => ({ category: m.category === '' ? 'Uncategorised' : m.category, multiple: m.multiple, comparables: m.comparables }));
  const segmentSizes: Record<Segment, number> = { launch: 0, product: 0, exchange: 0 };
  for (const r of board) segmentSizes[r.segment]++;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    global_multiple: globalMultiple,
    median_age_days: medianAgeDays(snapshot),
    multiples,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    segment_sizes: segmentSizes,
    live_size: live.length,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  if (board.length < 100) return `the board holds ${board.length} rows, under the gate's 100`;
  if (board.length > 4000) return `the board holds ${board.length} rows, over the gate's 4000`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 100_000_000_000_000) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
