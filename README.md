# find-strips

Builds a searchable, browsable archive of a comic strip from YAML: full-text search of transcripts and
descriptions, a calendar grid, books and story arcs, characters, creators and subjects, reruns, a reader's
own library, and a page for every strip, prerendered so it loads before any script runs.

It is the engine behind a site per strip. You give it a configuration file and the strips' data; it gives
back a folder of static files for any host. The [`demo/`](demo/) archive is a made-up strip with every part
filled in, and **[the demo is built from this repository on every push](https://braxtonhall.ca/find-strips/)**.
Its pictures are coloured rectangles; it is the example to copy.

## Quick start

```sh
yarn install
yarn build        # find-strips build demo/config.yaml dist
yarn serve        # http://localhost:3000
```

To use it for your own strip, depend on a tag of this repository and give it your configuration:

```json
{
	"devDependencies": { "find-strips": "github:braxtonhall/find-strips#0.1.0" },
	"scripts": {
		"build": "find-strips build config.yaml dist",
		"serve": "find-strips serve dist"
	}
}
```

## Command line

`find-strips <command>`:

| Command                                   | Does                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `build <config> <outDir>`                 | Builds the site into `outDir`. `--mode development`, `--watch`, `--env-file <path>` |
| `serve <dir> [--port <n>]`                | Serves a built site, to look at it locally                                          |
| `check <config> [--env-file <path>]`      | Loads and validates the configuration and every file it imports; builds nothing     |
| `candidates <config> [--env-file <path>]` | Lists compound words `compounds` does not mention yet                               |

The build writes one HTML file per address — `1990-03-12.html`, `book/pipandmarlow.html`, `credits.html`,
and so on — each holding that page as the app would draw it, plus the data it was drawn from in a
`<script type="application/json">` in the head. A cold load paints before the script runs and unfurls with
its own title and description when shared; once the script runs it takes the page over in place. The home
page is also written as `404.html` and `not_found.html`.

Addresses need a host that serves `credits.html` for `/credits`, which GitHub Pages and Neocities do. For a
host that does not, set `PAGE_LAYOUT=directory` to write `credits/index.html` instead.

## Programmatic use

```ts
import { build, loadSite, check } from "find-strips";
import { createSearch } from "find-strips/search";

await build({ config: "config.yaml", outDir: "dist" });

const site = loadSite("config.yaml"); // strips, descriptions, tuning, compounds, books, arcs, …
const { search } = createSearch(site);
const results = search("kite oak", { sort: "rank", tuning: { sequenceWeight: 2 } });
```

- `build({ config, outDir, mode?, watch?, envFile? })` does what `find-strips build` does.
- `loadSite(config, { envFile? })` reads everything the configuration describes, once.
- `check(config, { envFile? })` returns `{ ok, error? }`, as `find-strips check` does.
- `find-strips/search` has `createSearch(site)` and re-exports `search`, `stem`, `parseQuery` and
  `parseDateExpression` and their types. A process works with one site: the engine keeps what it reads from
  the configuration (the span of the archive, the tuning) and the strips it searches in module state.
- `find-strips/testing` has the helpers the engine's own tests use: `buildArchive`, `install`,
  `ENGINE_TUNING`, `withConfig`.

## Configuration

Everything about the site and its archive is in one YAML file, and the comments in
[`demo/config.yaml`](demo/config.yaml) explain each setting. Any value can read the environment as `$NAME`,
`${NAME}` or `${NAME:-fallback}`: from the process's, else from `.env` in the folder the build runs from, or the
file `--env-file` names in its place. `SITE_URL` sets the site's address, which turns on its canonical tags, sitemap and
`CNAME`, and can mount it under a path (`https://example.com/strip/`). The mount is compiled into the
bundle, so changing it needs a fresh build rather than a `--watch` rebuild.

The build also writes a `robots.txt` (and a `CNAME` where the site is served from a domain's root) from `SITE_URL`.

### Images

A strip's image goes in the folder `comicImages` names, as `YYYYMMDD.ext` or a special's id — drop one in
and that strip has an image. Covers, portraits and the banner are named from the files that use them, as
`!Path ./cover.png`.

### Tests

`yarn test` runs the engine's tests against an archive made of the demo plus filler strips with the shape of
a long-running strip, and a second, bare one for a site without the optional parts. `yarn typecheck`,
`yarn lint`. A site that tunes its search keeps its tuning tests in its own repository, on `loadSite` and
`createSearch`.

## Search syntax

Type words to search transcripts. Type `@` in the search box for the list of filters. The site's `/searching` page explains each filter and operator the site has, with example questions
(`search.examples` in `config.yaml`) that link to the searches answering them.

| Filter        | Example                        | Meaning                                                   |
| ------------- | ------------------------------ | --------------------------------------------------------- |
| `@year:`      | `@year:1990`, `@year:91`       | strips from that year, or any year ending in those digits |
| `@month:`     | `@month:8`, `@month:august`    | that month, in every year                                 |
| `@day:`       | `@day:3`, `@day:saturday`      | a day of the month, or a day of the week                  |
| `@date:`      | `@date:1988`, `@date:1988/9/3` | a date, at whatever precision you give                    |
| `@before:`    | `@before:1990`                 | strips before that date, excluding it                     |
| `@after:`     | `@after:1987`                  | strips after that date, excluding it                      |
| `@in:`        | `@in:treasury`, `@in:book2`    | strips printed in that book                               |
| `@is:`        | `@is:sunday`, `@is:rerun`      | strips with that tag                                      |
| `@i:`         | `@i:own`, `@i:bookmarked`      | strips you own, bookmarked or noted                       |
| `@featuring:` | `@featuring:wren`              | strips featuring that character                           |
| `@by:`        | `@by:ada`                      | strips by that creator                                    |
| `@about:`     | `@about:kite`                  | strips about that subject, like a running gag             |
| `@during:`    | `@during:kiteflight`           | strips in that story arc                                  |

The tags are `sunday` and `daily` (the colour Sundays and the black-and-white dailies), `reused`
(a strip on the day it first ran, where it was later rerun), `rerun` (a strip on a day it ran
again), `altered` (a strip some book printed with changes), `empty` (a strip with an empty
transcript), `standalone` (a strip in no arc) and `any` (every strip — see below). Those are facts about the strip; `@i:` is your
relationship to it, kept in your browser: `@i:own` (a printing you own), `@i:bookmarked` and
`@i:noted` (a strip you wrote a note on). Reruns only appear in results when the search asks for
`@is:rerun` or `@i:`, or names the exact date one ran.

Different filters narrow. Repeating a filter widens where a strip can have only one value for it —
`@day:saturday @day:sunday` is the weekend, and `@year:1990 @year:1991` is either year — and for
books, which mostly share no strips: `@in:pipandmarlow @in:treasury` is the strips printed in either book
(`@in:pipandmarlow @and @in:treasury` is both) — and for creators, who mostly either made every strip together
or took over from each other: `@by:ada @by:basil` is either one's strips. Writing `@or` between some of them changes nothing:
`@year:1990 @or @year:1991 @year:1992` is any of the three years. Repeating a tag narrows, for `@i:` as for `@is:`: `@is:sunday @is:rerun` is the Sundays
that ran again, and so does repeating a character: `@featuring:wren @featuring:pip` is the
strips with both, or a subject: `@about:kite @about:moon` is the strips about both. `@day:1 @day:monday` is the Mondays that fell
on the first, because a day of the month and a day of the week are different things. Filters combine
with ordinary words, so `@year:1990 potato` searches 1990 alone.

Three operators combine words and filters, tightest first:

| Operator | Example                         | Meaning                                        |
| -------- | ------------------------------- | ---------------------------------------------- |
| `@not`   | `potato @not @is:sunday`        | without the next word, filter, or `(group)`    |
| `@or`    | `@day:saturday @or @day:sunday` | either the word, filter or `(group)` each side |
| `@and`   | `@year:1990 @and @month:3`      | both — a space, without the widening above     |

Quotation marks ask for exact words: `"sand castle"` is those two words, in that order, side by
side, with no other spelling, inflection or near miss of either — though punctuation between them,
a compound written the other way (`"sand castle"` for `sandcastle`) and a known misspelling (`"marlowe"` for
`marlow`) still count. Everything inside is
text, so `"hester @or baby"` is a phrase rather than a choice; it is never read as a date either,
so `"1988"` finds the strips that say it. A quotation left open closes at the end, and curly quotes
work too. A quotation is one atom to the operators above, so `@not "baby sitter"` is anything that
does not say baby sitter.

So `hester @or baby sitter` is `(hester @or baby) sitter`; the phrase needs parentheses,
`hester @or (baby sitter)`. `@not baby sitter` is sitter without baby, and `@not (baby sitter)` is
anything without both. A word under `@not` is matched literally, in any inflection, rather than
searched for.

`@in:` takes a book's id rather than its title, because a filter value takes no spaces. Type `@in:`
and the menu lists every book the archive indexes with its title beside it, so `@in:pipandmarlow` is _Pip and Marlow_ and `@in:treasury` is _The Demo Treasury_. A book that is
not on that list matches nothing and says so.

### Strips and their collections

Books, story arcs, creators, characters and subjects are each a collection of strips, and one
operator crosses from a strip to each kind: `@in` to its books, `@during` to its arcs, `@by` to its
creators, `@featuring` to its characters and `@about` to its subjects. Each takes the one word, filter or `(group)` after it, which is about
the collection rather than the strip — `@in:pipandmarlow` is short for `@in (@id:pipandmarlow)`:

| Example                          | Meaning                                         |
| -------------------------------- | ----------------------------------------------- |
| `@in @i:own`                     | in a book you own                               |
| `@i:own @or @in @i:own`          | a printing you own, or in a book you own        |
| `@only @in @i:own`               | in at least one book, and only in books you own |
| `@not @in @is:any`               | in no book at all                               |
| `@in (@id:book2 @as:altered)`    | altered in Pip Strikes Again                    |
| `@in (@id:pipandmarlow @page:7)` | on page 7 of _Pip and Marlow_                   |

`@only` before any of these is "at least one, and all of them". `@is:any` is anything at all, so
`@in @is:any` is in any book and `@not @featuring @is:any` features no character. `@as:altered`, inside one, is
about how that collection prints that strip, where `@is:altered` is altered in any book. `@page:` and
`@book:` say where it prints it: on which page, and for a set like a Treasury or a Treasury, which numbered book of it, since each starts its pages again —
`@in (@id:treasury @book:2 @page:3)`.

The Collections page has a search box too, and the tab you are on says which kind of collection it
finds. A collection's words are its own — a book's title, an arc's description, a subject's name,
keywords and description — and an arc's are every word of its strips too, so `wren mum` finds the arcs where both appear, in one strip or
two. Anything about its strips goes in `@has`, which crosses back down: `@has @is:sunday` is an arc
with a Sunday, `@not @has @is:sunday` one without, `@only @has @year:1990` one entirely in 1990, and
`@not @has @is:any` one with no strips. Each kind has its own filters, and another kind's is a
mistake where it is written: `@is:` (`any` for every kind, `colour` for a book, `writer` and
`artist` for a creator), `@i:` (`own`, `noted` — only a book), `@id:` and `@published:` (a book, an
arc or a subject: a year, as `@year:` takes it — a book's year, or any year one of an arc's or a
subject's strips ran; two side by side mean either). `@as:`, `@book:` and `@page:` describe a strip
in a book, so `@during @as:ink` is a mistake too.

Filter values are read year first — `@date:1988/9/3` is September 3rd, never March 9th — and take
no spaces. A bare date typed on its own is understood without any `@`, as long as it starts from
the year: `1988`, `august 1988` and `august 3 1988` are all dates, while a day in every year is
what `@month:august @day:3` is for.

A two-digit year is every year ending in those digits, never a guess at the century: `@year:88`,
`@date:88/9/3` and a bare `aug 3 '88` all mean any year ending in 88 — in an archive with strips from 1988 and 1990, only
1988 — while `@before:` and `@after:` need all four digits, because a bound has to be a single day.
