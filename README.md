# jsonOptimiser
### Optimise the JSON files in a Minecraft Resource Pack

jsonOptimiser is a program that will go through all JSON files in a Minecraft resource pack and optimise them to be as small as possible, removing any unnecessary data.

This process is one-way and cannot be undone, so make a backup if you want a version with untouched json files.

## Changes:
- Minifies JSON files
- Removes default credits. Custom credits are kept.
- Removes unnecessary keys
- Block/Items models
  - Remove `groups`
  - `rotation`
    - Remove `rotation` when `angle` is `0`
    - Remove `rescale` when it is `false`
  - `faces`
    - Remove `rotation` when it is `0`
    - Remove `tintindex` when it is `-1`
    - Remove empty `face`
  - Remove `shade` when it is `true`
  - Remove empty `elements`
- Animation .mcmeta
  - Remove file when no texture exists
  - Remove `interpolate` when it is `false`
  - Remove `frametime` when it is `1`
  - Remove `width` when frames are square
  - Remove `height` when frames are square
  - `frames` 
    - Remove `time` when it matches `frametime`
    - Remove `frames` when all frames are present, in order, with matching `frametime`
    - Change most common `time` to be the `frametime` and make old `frametime` into `time`
- OptiFine CEM
  - Remove `animations` when it is empty
  - Remove `translation` when all axes are `0`
  - Remove `rotation` when all axes are `0`
  - Remove `scale` when it is set to `1`
  - Remove empty `boxes`
  - Remove empty `sprites`
  - Remove empty `submodel`
  - Remove empty `submodels`

## Installing
How to install this program:
1. Download this repository as a zip from `Code > Download ZIP`, or from [this link](https://github.com/ewanhowell5195/jsonOptimiser/archive/refs/heads/main.zip)
2. Extract the zip archive to a folder
3. Install Node.js and the NPM packages
   - Automatic (Windows):
     1. Run the `install.bat` file
   - Manually (Windows / MacOS):
     1. Download and install [**Node.js**](https://nodejs.org/it/download/current)
     2. Open a terminal window and navigate to the extracted zip location
     3. Run the command `npm install`

## Running
How to run this program:
- Windows
  1. Run `run.bat`
- MacOS
  1. Open a terminal window and navigate to the extracted zip location 
  2. Run `node index.js`
