# Nightfinder

[Open Nightfinder](https://coolcode.ca/nightfinder/) to plan a photo session from over 3,500 Canadian communities, the Kejimkujik preset or your own coordinates. Filter by province or territory, type a place name, then select the matching location to fill its coordinates and time zone. Searches tolerate accents and common punctuation. The display covers local noon to the following noon, including daylight saving changes. Compare astronomical dark hours, Moon phase and altitude, planet and deep-sky target positions, and the frame from your sensor and focal length. The time slider is keyboard accessible. Export a local JSON plan with UTC timestamps.

A calculated Langley or Halifax plan opens [Crater Light](https://coolcode.ca/otherworldnames/crater-light/?feature=1296) for Copernicus at the same observing site and local date. The planner uses the USGS lunar Gazetteer and JPL Horizons geometry. Custom coordinates stay in Nightfinder.

<!-- coolcode:guide -->
Choose 30, 60, 90 or 120 minutes and optionally require the Moon below the horizon. Nightfinder ranks each target’s continuous dark session by its lowest sampled altitude. Select a target to move the chart to its start, read the compass bearing, and download the sessions with the plan.
<!-- /coolcode:guide -->

The catalogue card is maintained in [tool.json](tool.json). Its practical example appears in the marked excerpt above.

## Canadian place search

The offline gazetteer uses community centres from the [GeoNames cities500 export](https://download.geonames.org/export/dump/), adapted under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The edition date appears under “How Nightfinder calculates the sky”. The November 19, 2026 edition offers 3,527 choices across all ten provinces and three territories, including original local presets. GeoNames supplies the time zone for each place. An observer can adjust the coordinates for a campsite or switch to custom coordinates anywhere. The date belongs to the observing site, and the browser supplies its IANA time-zone rules, including Newfoundland’s half-hour offset and regional daylight saving changes.

Run `python3 scripts/update_places.py` to regenerate the gazetteer from the current upstream archive, or pass `--zip /path/to/cities500.zip` to reproduce a dated download. The build bundles the saved edition and works independently of GeoNames availability at visiting time.

## Build

Run `node --test tests/*.test.mjs` to check session selection. Run `python3 scripts/build.py` and `python3 -m http.server 8000 --directory dist`. Open http://localhost:8000/. The build pins and checks the integrity of [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy), under its bundled MIT notice. GitHub Pages serves the compiled directory. The calculations run entirely in your browser and coordinates do not leave the device.

## Methods

Astronomy Engine evaluates the Sun, Moon and planets. A small curated J2000 catalogue contains standard positions and approximate angular sizes for common imaging targets, with object designations searchable in [SIMBAD](https://simbad.cds.unistra.fr/simbad/). Positions use a geometric horizon and samples every six minutes. The session finder checks every sample including both ends, and retains the earliest block in an exact altitude tie. A session ends on the following local date when it crosses midnight. The export records the duration, Moon setting and UTC millisecond bounds of each recommendation. Dark intervals interpolate Sun altitude at −18°. Target windows use the altitude filter and a sampled dark period. Framing assumes a rectilinear lens and the ability to rotate the camera. Weather and actual terrain visibility need a separate check. Forecasts are linked from the app.
