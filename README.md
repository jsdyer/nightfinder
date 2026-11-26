# Nightfinder

[Open Nightfinder](https://coolcode.ca/nightfinder/) to plan a photo session from over 3,500 Canadian communities, the Kejimkujik preset or your own coordinates. Filter by province or territory, type a place name, then select the matching location to fill its coordinates and time zone. Searches tolerate accents and common punctuation. The display covers local noon to the following noon, including daylight saving changes. Compare astronomical dark hours, Moon phase and altitude, planet and deep-sky target positions, and the frame from your sensor and focal length. The time slider is keyboard accessible. Export a local JSON plan with UTC timestamps.

A calculated Langley or Halifax plan opens [Crater Light](https://coolcode.ca/otherworldnames/crater-light/?feature=1296) for Copernicus at the same observing site and local date. The planner uses the USGS lunar Gazetteer and JPL Horizons geometry. Custom coordinates stay in Nightfinder.

<!-- coolcode:guide -->
Save a named balcony/building horizon to find when a target clears it, constrain Moon separation, and calculate seven days of golden light (Sun −4° to +6°) and blue light (−6° to −4°), alongside dark-sky target sessions. Optionally load cloud-cover forecasts for those windows; that click sends coordinates to Open-Meteo. Download the plan to retain the calculated windows.
Choose the Peggy’s Cove or Stanley Park photography preset, then load the optional cloud forecast and set a maximum cloud cover for observing sessions. Saved locations preserve whether a horizon obstruction is enabled.
<!-- /coolcode:guide -->

The catalogue card is maintained in [tool.json](tool.json). Its practical example appears in the marked excerpt above.

## Canadian place search

The offline gazetteer uses community centres from the [GeoNames cities500 export](https://download.geonames.org/export/dump/), adapted under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The edition date appears under “How Nightfinder calculates the sky”. The November 19, 2026 edition offers 3,527 choices across all ten provinces and three territories, including original local presets. GeoNames supplies the time zone for each place. An observer can adjust the coordinates for a campsite or switch to custom coordinates anywhere. The date belongs to the observing site, and the browser supplies its IANA time-zone rules, including Newfoundland’s half-hour offset and regional daylight saving changes.

Run `python3 scripts/update_places.py` to regenerate the gazetteer from the current upstream archive, or pass `--zip /path/to/cities500.zip` to reproduce a dated download. The build bundles the saved edition and works independently of GeoNames availability at visiting time.

## Build

Run `node --test tests/*.test.mjs` to check session selection. Run `python3 scripts/build.py` and `python3 -m http.server 8000 --directory dist`. Open http://localhost:8000/. The build pins and checks the integrity of [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy), under its bundled MIT notice. GitHub Pages serves the compiled directory. The calculations run entirely in your browser and coordinates do not leave the device.

## Methods

Astronomy Engine evaluates the Sun, Moon and planets. A small curated J2000 catalogue contains standard positions and approximate angular sizes for common imaging targets, with object designations searchable in [SIMBAD](https://simbad.cds.unistra.fr/simbad/). Positions use a geometric horizon and samples every six minutes. The session finder checks every sample including both ends, and retains the earliest block in an exact clearance tie. A session ends on the following local date when it crosses midnight. The export records the duration, Moon setting and UTC millisecond bounds of each recommendation. Dark intervals interpolate Sun altitude at −18°. Target windows use the altitude filter and a sampled dark period. Framing assumes a rectilinear lens and the ability to rotate the camera. Weather and actual terrain visibility need a separate check. Forecasts are linked from the app.


## Added browser workflow

Choose a location to calculate seven days of golden light (Sun −4° to +6°) and blue light (−6° to −4°), alongside dark-sky target sessions. Optionally load cloud-cover forecasts for those windows; that click sends coordinates to Open-Meteo. Download the plan to retain the calculated windows.

## Saved horizons and Moon separation

Open **Your balcony, buildings and local horizon**. Enter azimuth/obstruction-altitude pairs (degrees), for example `0, 10`, `90, 40`, `180, 10`, `270, 5`. Azimuth is clockwise from true north. The app linearly interpolates between points and across north; use points close together at building edges. A single point defines a flat obstruction. Values must be 0–360° azimuth and 0–90° obstruction height. Enable the profile, choose extra clearance, then calculate.

**Save site and horizon** keeps up to 20 named profiles with latitude, longitude and time zone in namespaced localStorage. Saving an existing name replaces that profile. **Load saved site** restores it; changing location disables the active profile to avoid applying one balcony to another town. Saved values never leave the browser. Exported JSON plans include the applied profile, clearance and constraints.

The chart reports the target's sampled geometric visibility above the obstruction separately from dark observing windows. Observing windows meet the maximum of your altitude cutoff and obstruction plus clearance. A requested Moon separation applies while the Moon is above the geometric horizon, except to the Moon itself. Angular separation uses topocentric horizontal directions through the spherical cosine rule; it is independent of phase and is not a sky-brightness estimate. The best continuous block maximizes its lowest clearance above the combined cutoff, with the earliest block winning exact ties. Existing sensor/focal-length camera framing and photography windows remain intact.

Sampling is every six minutes; a narrow obstacle or brief opening can be missed. No atmospheric refraction or automatic terrain model is used. All calculations remain local using the pinned [Astronomy Engine](https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md); no additional key, service or scheduled collector is required.

## Coastal photography and forecast coverage

Peggy’s Cove (Peggys Point lighthouse) and Stanley Park (approximate centre) are configured in `web/photo-places.mjs`, with official coordinate sources and regional tide-reference notes. Coordinates remain editable; a preset is not a claim about access, an unobstructed horizon or the best camera position. `?photo_place=peggys-cove&date=2026-11-26` and `?photo_place=stanley-park` are shareable entry points. Tide & Dark uses the same IDs.

The existing saved-site profiles now retain their enabled/disabled obstruction state. Save a location with **Apply this obstruction profile** unchecked to keep coordinates without inventing a horizon. Older saved profiles load as enabled for backward compatibility. All named profiles stay in local browser storage and can be deleted.

**Maximum forecast cloud** filters every candidate observing block, not just the previously selected best block. It requires uninterrupted hourly forecast coverage and checks the maximum hourly cloud amount, then chooses the eligible block with the highest minimum target clearance. Unloaded, missing, invalid or out-of-range forecast hours cannot qualify. Average cloud percentages in the light-window table are duration-weighted; no partial forecast is presented as complete. Forecasts are approximate, and low cloud cover does not guarantee transparency or seeing. No new keys, Worker route or scheduled collector is required.
