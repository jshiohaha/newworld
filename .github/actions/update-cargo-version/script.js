const fs = require("fs");
const TOML = require("@iarna/toml");

const MAJOR = "major";
const MINOR = "minor";
const PATCH = "patch";
// const CARGO_TOML_PATH = "./Config.toml";

const getUpdatedVersion = (semvar, { major, minor, patch }) => {
  if (semvar === MAJOR) {
    major += 1;
  } else if (semvar === MINOR) {
    minor += 1;
  } else if (semvar === PATCH) {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
};

module.exports = ({ github, context }, cargoPath, semvar) => {
  const CARGO_TOML_PATH = cargoPath;

  // Test both the read and write permissions
  fs.access(CARGO_TOML_PATH, fs.constants.R_OK | fs.constants.W_OK, (err) => {
    console.log("semvar: ", semvar);

    console.log("\n> Checking Permission for reading and writing to file");
    if (err) throw new Error("No read and write access");

    // const { SHA } = process.env;
    let tomlObj = TOML.parse(fs.readFileSync(CARGO_TOML_PATH, "utf-8"));
    console.log("tomlObj: ", tomlObj);
    const package = tomlObj.package;
    console.log("package: ", package);
    if (!package) throw new Error("No package tag defined in Cargo.toml");
    let [major, minor, patch] = package.version.split(".").map((v) => +v);

    console.log("major: ", major);
    console.log("minor: ", minor);
    console.log("patch: ", patch);

    const updatedVersion = getUpdatedVersion(semvar, { major, minor, patch });
    console.log("updatedVersion: ", updatedVersion);

    // update version
    tomlObj.package.version = updatedVersion;

    // print updated version
    console.log("tomlObj: ", tomlObj);

    // save updated version
    fs.writeFileSync(CARGO_TOML_PATH, TOML.stringify(tomlObj));
  });

  return null;
};
