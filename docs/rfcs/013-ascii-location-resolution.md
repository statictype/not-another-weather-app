# RFC 013 — Resolve the location once, in ASCII

## Problem

`?city=Tromsø, Norway` returned Norway, Kansas at the edge and Norway, Iowa
from the dev server, at the same minute. Both were cache hits, of two
different wrong cities.

WeatherAPI matches its location index in ASCII. A query that carries a
diacritic and more than one token drops the accented token and matches on what
is left. The tail token is what answers:

| `q=`                    | `current.json` returns                     |
| ----------------------- | ------------------------------------------ |
| `tromsø, norway`        | Norway, Iowa, United States of America     |
| `malmö, sweden`         | New Sweden, Maine, United States           |
| `zürich, switzerland`   | Little Switzerland, North Carolina         |
| `münchen, germany`      | New Germany, Minnesota                     |
| `medellín, colombia`    | Colombia, Antioquia, Colombia              |
| `tromsø, troms, norway` | Å, Troms, Norway                           |
| `oslo, norway`          | Oslo, Norway — ASCII, so the match is fine |

Three separate failures follow from it:

1. **The city is wrong.** Every accented city in `random-cities.ts` and every
   accented autocomplete pick resolves to somewhere else. The clock is wrong
   with it: `location.tz` came back `America/Chicago`, so `clock.ts` rendered
   Chicago time under a Norwegian city name.
2. **Which wrong city varies by caller.** Several US towns are named Norway;
   the tie-break differs between a Cloudflare colo and a local `fetch`. Two
   viewers on different colos can see different cities for one URL.
3. **The two tiers resolve independently.** `current` (600 s TTL) and
   `forecast` (3600 s TTL) each ran their own fuzzy match, so one page could
   show Kansas conditions above Iowa sunrise times.

Folding alone does not close it. `munchen` returns Münchenstein, Switzerland
while `münchen` returns München, Bayern — a lone accented token matches, and
folding it can miss the record. And `łódź` has no record under its own
spelling at all, while `lodz` does.

## Proposal

### 1. Fold what goes upstream — `src/worker/fold.ts`

`upstreamQuery(query)` folds to ASCII only when the query has a diacritic
_and_ more than one token, which is exactly the case upstream mismatches. NFD
strips the combining marks; a table covers the letters NFD does not decompose
(`ø đ ł ð ı ß æ œ þ`).

### 2. Resolve once, then fetch by id — `src/worker/locate.ts`

`resolveLocation(query)` sends the shaped query to `search.json`, takes the
first hit, and returns `id:N`. Both weather tiers fetch `q=id:N`, which has no
fuzzy step: same city, every caller, both tiers. The resolution is cached for
24 h under the folded query — a city's id does not move — so the extra round
trip costs one upstream call per city per day.

`search.json` retries with the folded query when the query as typed returns
nothing, which is what makes `łódź` resolvable. `lat,lon` from geolocation
skips resolution: coordinates are already exact.

An empty hit list is `not_found`, so a nonexistent city now 404s before any
weather call rather than after one.

### 3. Restore the diacritics for display

Upstream echoes back the script it was asked in, so an ASCII query yields
`Tromso`. `restoreFromQuery(name, query)` copies the diacritics of the query
onto the name when the two spell the same word folded — case comes from
upstream, so `TROMSØ` typed still reads `Tromsø`. The query is the only place
a diacritic can come from: upstream never sends one it was not sent.

An ASCII query never strips an accent upstream did send, and a query that only
prefixes the name (`malmö` against `Malmoral`) restores nothing.

## Consequences

- One upstream `search.json` call per city per day, on top of the weather call.
- `/api/search` suggestions now carry the viewer's diacritics, and the id
  behind a suggestion is the id the weather call uses — the autocomplete list
  and the weather lookup are the same resolver.
- `CACHE_VERSION` bumped to `11`; entries cached against the fuzzy match are
  skipped rather than aged out over the hour.
- Two curated cities still resolve to upstream's own oddities, unrelated to
  this change: `Kufra, Libya` returns Kufra, Siirt, Turkey, and
  `Bali, Indonesia` returns Bali, North Sumatra.
