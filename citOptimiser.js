import { spawn } from "node:child_process"
import { loadImage } from "skia-canvas"
import path from "node:path"
import fs from "node:fs"

const p = spawn("powershell.exe", [`
  Add-Type -AssemblyName system.Windows.Forms
  $SetBackupLocation = New-Object System.Windows.Forms.SaveFileDialog
  $SetBackupLocation.InitialDirectory = [Environment]::GetFolderPath('ApplicationData') + '\\.minecraft\\resourcepacks'
  $SetBackupLocation.Title = 'Select Folder - Enter a folder so it is selected and then click on Save'
  $SetBackupLocation.FileName = 'Select Folder'
  $rc = $SetBackupLocation.ShowDialog()
  if ($rc -eq [System.Windows.Forms.DialogResult]::OK)
  {
    $BackupLocation = $SetBackupLocation.FileName
    $BackupLocation = $BackupLocation.Replace('Select Folder', "")
  }
  echo $BackupLocation
`])

let data = ""
for await (const chunk of p.stdout) {
  data += chunk
}

const dir = data.trim()

if (!dir) process.exit()

if (dir.includes("�")) {
  const p = spawn("powershell.exe", [`
    Add-Type -AssemblyName PresentationCore,PresentationFramework
    [System.Windows.MessageBox]::Show('Unicode path detected. This program does not support unicode file paths. Please rename the folder to remove any unicode characters.')
  `])
  for await (const chunk of p.stdout) {}
  process.exit()
}

const p2 = spawn("powershell.exe", [`
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show('Are you sure you want to run CIT Optimiser over this folder:\n\n${dir}', 'Confirmation', 'YesNo');
`])

let data2 = ""
for await (const chunk of p2.stdout) {
  data2 += chunk
}

if (data2.trim() === "No") process.exit()

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

let beforeTotal = 0
let afterTotal = 0
let fileCount = 0
for await (const file of getFiles(dir)) {
  if (file.includes(".git") || !file.endsWith(".properties")) continue
  fileCount++
  const before = (await fs.promises.stat(file)).size
  beforeTotal += before
  console.log(file)
  console.log(`Before: ${formatBytes(before)}`)
  let data
  try {
    data = (await fs.promises.readFile(file, "utf-8")).trim()
  } catch (err) {
    console.log(`Skipping ${file} as it could not be read`)
    continue
  }
  data = data.replace(/(type=item\n?|minecraft:)/g, "")
  data = data.replace(/matchItems/g, "items")
  await fs.promises.writeFile(file, data.trim(), "utf-8")
  const after = (await fs.promises.stat(file)).size
  afterTotal += after
  console.log(`After: ${formatBytes(after)}\n\n`)
}

console.log(`-----\n\nCompressed ${fileCount} files\nBefore: ${formatBytes(beforeTotal)}\nAfter: ${formatBytes(afterTotal)}\nSaved: ${formatBytes(beforeTotal - afterTotal)}`)