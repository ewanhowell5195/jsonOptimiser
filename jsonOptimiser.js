import { openDirectory, confirm } from "easy-file-dialogs"
import { loadImage } from "skia-canvas"
import path from "node:path"
import fs from "node:fs"

const dir = await openDirectory({
  title: "Select resource pack",
  initialDir: `${process.env.APPDATA}/.minecraft/resourcepacks`
}).catch(() => process.exit())

if (!(await confirm({
  title: "Run JSON Optimiser?",
  message: `Are you sure you want to run JSON Optimiser over this folder:\n\n${dir}`,
  warning: true
}))) process.exit()

const getFiles = async function*(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFiles(res)
    } else {
      yield res
    }
  }
}

const sizes = ["B", "KB", "MB", "GB", "TB"]
function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i]
}

function processPart(part, rootMode) {
  for (const key in part) {
    if (!(rootMode ? partKeys.concat(modelKeys) : partKeys).includes(key)) delete part[key]
  }
  if (part.translate && part.translate.every(e => !e)) delete part.translate
  if (part.rotate && part.rotate.every(e => !e)) delete part.rotate
  if (part.scale === 1) delete part.scale
  if (part.boxes) {
    for (const box of part.boxes) {
      for (const key in box) {
        if (!boxKeys.includes(key)) delete box[key]
      }
    }
    part.boxes = part.boxes.filter(e => Object.keys(e).length)
    if (!part.boxes.length) delete part.boxes
  }
  if (part.sprites) {
    for (const sprite of part.sprites) {
      for (const key in sprite) {
        if (!spriteKeys.includes(key)) delete sprite[key]
      }
    }
    part.sprites = part.sprites.filter(e => Object.keys(e).length)
    if (!part.sprites.length) delete part.sprites
  }
  if (part.submodel) {
    processPart(part.submodel)
    if (!Object.keys(part.submodel).length) delete part.submodel
  }
  if (part.submodels) {
    for (const submodel of part.submodels) {
      processPart(submodel)
    }
    part.submodels = part.submodels.filter(e => Object.keys(e).length)
    if (!part.submodels.length) delete part.submodels
  }
}

const mcmetaKeys = [ "credit", "animation", "villager", "texture", "pack", "language", "filter" ]
const animationKeys = [ "interpolate", "width", "height", "frametime", "frames" ]
const jemKeys = [ "credit", "texture", "textureSize", "shadowSize", "models" ]
const modelKeys = [ "model", "id", "part", "attach", "scale", "animations" ]
const partKeys = [ "id", "texture", "textureSize", "invertAxis", "translate", "rotate", "mirrorTexture", "boxes", "sprites", "submodel", "submodels" ]
const boxKeys = [ "textureOffset", "uvDown", "uvUp", "uvNorth", "uvSouth", "uvWest", "uvEast", "coordinates", "sizeAdd" ]
const spriteKeys = [ "textureOffset", "coordinates", "sizeAdd" ]
const elementKeys = [ "from", "to", "rotation", "faces", "shade" ]
const faceKeys = [ "uv", "texture", "cullface", "rotation", "tintindex" ]
modelKeys.push(...partKeys)

let beforeTotal = 0
let afterTotal = 0
let fileCount = 0
for await (const file of getFiles(dir)) {
  if (file.includes(".git")) continue
  if (!(file.endsWith(".json") || file.endsWith(".mcmeta") || file.endsWith(".jem") || file.endsWith(".jpm"))) continue
  fileCount++
  const before = (await fs.promises.stat(file)).size
  beforeTotal += before
  console.log(file)
  console.log(`Before: ${formatBytes(before)}`)
  let data
  try {
    data = JSON.parse((await fs.promises.readFile(file, "utf-8")).trim())
  } catch (err) {
    console.log(`Skipping ${file} as it could not be read`)
    continue
  }
  if (data.credit === "Made with Blockbench") delete data.credit
  if (file.endsWith(".json")) {
    delete data.groups
    if (data.elements) {
      for (const element of data.elements) {
        for (const key in element) {
          if (!elementKeys.includes(key)) delete element[key]
        }
        if (element.rotation) {
          if (element.rotation.angle === 0) delete element.rotation
          else {
            if (element.rotation.rescale === false) delete element.rotation.rescale
          }
        }
        if (element.faces) {
          for (const [key, face] of Object.entries(element.faces)) {
            for (const key in face) {
              if (!faceKeys.includes(key)) delete face[key]
            }
            if (face.rotation === 0) delete face.rotation
            if (face.tintindex === -1) delete face.tintindex
            if (!Object.keys(face).length) delete element.faces[key]
          }
        }
        if (element.shade) delete element.shade
      }
      data.elements = data.elements.filter(e => e.faces && Object.keys(e.faces).length)
    }
  }
  if (file.endsWith(".mcmeta")) {
    if (file.endsWith(".png.mcmeta")) {
      if (!fs.existsSync(file.slice(0, -7))) {
        console.log("After: 0 B\n\n")
        fs.rmSync(file)
        continue
      }
    }
    for (const key in data) {
      if (!mcmetaKeys.includes(key)) delete data[key]
    }
    if (data.pack) {
      for (const key in data.pack) {
        if (!(key === "pack_format" || key === "description")) delete data.pack[key]
      }
    }
    if (data.animation) {
      for (const key in data.animation) {
        if (!animationKeys.includes(key)) delete data.animation[key]
      }
      if (data.animation.interpolate === false) delete data.animation.interpolate
      if (data.animation.frametime === 1) delete data.animation.frametime
      if (data.animation.height) {
        const img = await loadImage(file.slice(0, -7))
        if (data.animation.height === img.width) delete data.animation.height
      }
      if (data.animation.width) {
        const img = await loadImage(file.slice(0, -7))
        if (data.animation.width === img.height) delete data.animation.width
      }
      if (data.animation.frames) {
        const frametime = data.animation.frametime ?? 1
        data.animation.frames = data.animation.frames.map(e => {
          if (e.time === frametime) return e.index
          return e
        })
        if (data.animation.frames.every((e, i) => e === i)) {
          const img = await loadImage(file.slice(0, -7))
          if (data.animation.frames.length === img.height / img.width) delete data.animation.frames
        } else {
          const times = new Map
          data.animation.frames.forEach(e => {
            if (typeof e === "number") {
              times.set(frametime, (times.get(frametime) ?? 0) + 1)
            } else {
              times.set(e.time, (times.get(e.time) ?? 0) + 1)
            }
          })
          const largest = Array.from(times).reduce((a, e) => {
            if (a[1] > e[1]) return a
            return e
          }, [1, 0])
          if (frametime !== largest[0]) {
            data.animation.frametime = largest[0]
            data.animation.frames = data.animation.frames.map(e => {
              if (typeof e === "number") return {
                index: e,
                time: frametime
              }
              if (e.time === largest[0]) return e.index
              return e
            })
          }
        }
      }
    }
  }
  if (file.endsWith(".jem")) {
    for (const key in data) {
      if (!jemKeys.includes(key)) delete data[key]
    }
    if (data.models) {
      for (const model of data.models) {
        for (const key in model) {
          if (!modelKeys.includes(key)) delete model[key]
        }
        if (!model.animations?.length) delete model.animations
        processPart(model, true)
      }
      data.models = data.models.map(e => {
        if (e.boxes || e.submodel || e.submodels || e.model || e.sprites) return e
        return { part: e.part }
      })
      if (!data.models.length) {
        for (const key in data) delete data[key]
      }
    }
  }
  if (file.endsWith(".jpm")) {
    processPart(data)
  }
  await fs.promises.writeFile(file, JSON.stringify(data), "utf-8")
  const after = (await fs.promises.stat(file)).size
  afterTotal += after
  console.log(`After: ${formatBytes(after)}\n\n`)
}

console.log(`-----\n\nCompressed ${fileCount} files\nBefore: ${formatBytes(beforeTotal)}\nAfter: ${formatBytes(afterTotal)}\nSaved: ${formatBytes(beforeTotal - afterTotal)}`)