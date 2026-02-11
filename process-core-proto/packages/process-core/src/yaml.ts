import yaml from "js-yaml"
import type { ProcessSpecV1 } from "./types.js"

export function dumpProcessYaml(spec: ProcessSpecV1): string {
  return yaml.dump(spec, { noRefs: true, lineWidth: 120, sortKeys: false })
}
