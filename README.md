# Nightfinder

[Open Nightfinder](https://coolcode.ca/nightfinder/) to plan a photo session from Langley, Vancouver, Aldergrove, Halifax, Kejimkujik or your own coordinates. The display covers local noon to the following noon, including daylight saving changes. Compare astronomical dark hours, Moon phase and altitude, planet and deep-sky target positions, and the frame from your sensor and focal length. The time slider is keyboard accessible. Export a local JSON plan with UTC timestamps.

A calculated Langley or Halifax plan opens [Crater Light](https://coolcode.ca/otherworldnames/crater-light/?feature=1296) for Copernicus at the same observing site and local date. The planner uses the USGS lunar Gazetteer and JPL Horizons geometry. Custom coordinates stay in Nightfinder.

## Build

Run `python3 scripts/build.py` and `python3 -m http.server 8000 --directory dist`. Open http://localhost:8000/. The build pins and checks the integrity of [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy), under its bundled MIT notice. GitHub Pages serves the compiled directory. The calculations run entirely in your browser and coordinates do not leave the device.

## Methods

Astronomy Engine evaluates the Sun, Moon and planets. A small curated J2000 catalogue contains standard positions and approximate angular sizes for common imaging targets, with object designations searchable in [SIMBAD](https://simbad.cds.unistra.fr/simbad/). Positions use a geometric horizon and samples every six minutes. Dark intervals interpolate Sun altitude at −18°. Target windows use the altitude filter and a sampled dark period. Framing assumes a rectilinear lens and the ability to rotate the camera. Weather and actual terrain visibility need a separate check. Forecasts are linked from the app.
