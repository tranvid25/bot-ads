const fs = require("node:fs");
const path = require("node:path");
function directoryBytes(directory) {
  if (!fs.existsSync(directory)) return 0;
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .reduce((sum, entry) => {
      const file = path.join(directory, entry.name);
      return (
        sum +
        (entry.isDirectory()
          ? directoryBytes(file)
          : entry.isFile()
            ? fs.statSync(file).size
            : 0)
      );
    }, 0);
}
function measure(output, artifact, variant) {
  return {
    variant,
    artifact: path.resolve(output, artifact),
    installerBytes: fs.statSync(path.join(output, artifact)).size,
    installedBytes: directoryBytes(path.join(output, "win-unpacked")),
    browserBytes: directoryBytes(
      path.join(output, "win-unpacked/resources/browsers"),
    ),
  };
}
module.exports = { directoryBytes, measure };
