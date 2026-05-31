# Queens generation evidence

Date: 2026-05-31

This records a post-optimization sanity sample for the Queens generator. The sample uses fixed seeds and validates each generated board for connected regions, uniqueness, and logic solvability.

## Single-board sample

Command shape:

```bash
pnpm exec tsx -e "<generatePuzzle stats for n=5..9, 50 fixed seeds each>"
```

| Size | Trials | Success | Connected | Unique | Logic-solvable | p50 ms | p90 ms | max ms | p50 logic steps | p90 logic steps |
| ---- | -----: | ------: | --------: | -----: | -------------: | -----: | -----: | -----: | --------------: | --------------: |
| 5x5  |     50 |      50 |        50 |     50 |             50 |    5.6 |   18.0 |   40.8 |              13 |              19 |
| 6x6  |     50 |      50 |        50 |     50 |             50 |    5.0 |   12.0 |   16.9 |              12 |              22 |
| 7x7  |     50 |      50 |        50 |     50 |             50 |   18.2 |   34.9 |   47.3 |              18 |              34 |
| 8x8  |     50 |      50 |        50 |     50 |             50 |   25.7 |   67.7 |  162.0 |              24 |              39 |
| 9x9  |     50 |      50 |        50 |     50 |             50 |  106.6 |  181.5 |  298.8 |              35 |              47 |

Observed rule usage across the sample:

| Size | unit-single | locked-candidates | hall-subset | conflict-coverage | assumption-contradiction |
| ---- | ----------: | ----------------: | ----------: | ----------------: | -----------------------: |
| 5x5  |         250 |               282 |          29 |                88 |                        0 |
| 6x6  |         300 |               311 |          18 |                42 |                        0 |
| 7x7  |         350 |               573 |          34 |                53 |                        0 |
| 8x8  |         400 |               777 |          51 |                25 |                        1 |
| 9x9  |         450 |              1085 |         115 |                30 |                        4 |

## Max-page sample

Command shape:

```bash
pnpm exec tsx -e "<buildPuzzles stats for n=8,9 at 6 pages each>"
```

| Size | Pages | Boards | Empty boards | Unique | Logic-solvable | Total ms |
| ---- | ----: | -----: | -----------: | -----: | -------------: | -------: |
| 8x8  |     6 |     36 |            0 |     36 |             36 |   1651.7 |
| 9x9  |     6 |     36 |            0 |     36 |             36 |   5441.1 |

## Failure conditions to watch

The current sample observed no failures. A board can still return `null` if every attempt within the budget fails one of these gates:

- hidden Queen placement fails;
- connected region construction cannot produce a valid region matrix;
- exact solver finds zero or multiple solutions;
- logic solver cannot finish the board with the allowed rules.

`buildPuzzles` preserves `null` as a visible blank slot in these cases; it does not replace failures with non-unique boards.
