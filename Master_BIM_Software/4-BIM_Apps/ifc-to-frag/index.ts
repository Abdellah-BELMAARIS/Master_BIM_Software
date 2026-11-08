import * as WEBIFC from "web-ifc"
import * as FRAGS from "@thatopen/fragments"
import * as fs from "fs"
import * as path from "path"

const serializer = new FRAGS.IfcImporter();
serializer.wasm.path = "/"

// Include Classifications --

serializer.classes.abstract.add(
  WEBIFC.IFCCLASSIFICATION,
  WEBIFC.IFCCLASSIFICATIONREFERENCE,
);

serializer.relations.set(WEBIFC.IFCRELASSOCIATESCLASSIFICATION, {
  forRelated: "HasAssociations",
  forRelating: "ClassificationForObjects",
});

// Include Types --

serializer.classes.abstract.add(
  ...FRAGS.ifcClasses.types, WEBIFC.IFCFURNITURETYPE
);

serializer.relations.set(WEBIFC.IFCRELDEFINESBYTYPE, {
  forRelated: "IsTypedBy",
  forRelating: "Types"
})

// Do the conversion --

const convert = async (files: string[]) => {
  console.log(files)
  for (const file of files) {
    const start = performance.now()
    const ifcBuffer = fs.readFileSync(file)
    const model = await serializer.process({ bytes: new Uint8Array(ifcBuffer) })
    const name = path.basename(file).replace("ifc", "frag")
    const outDir = path.dirname(file).replace("ifc", "frag")
    const outPath = path.join(outDir, name)
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)
    fs.writeFileSync(outPath, model)
    console.log(`${name} time: ${(performance.now() - start) / 1000}s`)
  }
}

const folderName = process.argv[2]
if (folderName && folderName.trim() !== "") {
  const folderPath = `./${folderName}`
  const files = fs.readdirSync(path.join(folderPath, "ifc")).map((file) => path.join(folderPath, "ifc", file))
  convert(files)
} else {
  console.log("Please provide a folder name as a command line argument.")
  process.exit(1)
}
