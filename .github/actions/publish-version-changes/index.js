const fs = require("fs");
const path = require("path");
const toml = require("@iarna/toml");
const axios = require("axios");

const { execSync } = require("child_process");

const wrappedExec = (cmd, cwd) => {
  let args = {
    stdio: "inherit",
  };

  if (cwd) {
    args["cwd"] = cwd;
  } else {
    // default to curernt dir
    args["cwd"] = path.join(__dirname);
  }

  execSync(cmd, args);
};

const isPackageType = (actual, target) => actual === target;
// additional equality checks can match other subdirs, e.g. `rust|test|cli|<etc>`
const isCratesPackage = (actual) => isPackageType(actual, "program");
const isNpmPackage = (actual) => isPackageType(actual, "js");

// assume most basic versioning for now: `major.minor.patch`
// only publish package if local > remote
const shouldPublishPackage = (localVersion, remoteVersion) => {
  // todo: test local version is strictly less than remote
  // walk from most to least significance
  return localVersion !== remoteVersion;
};

// npm package helpers

const getLocalNpmPackageInfo = (cwd) => {
  const packageJsonPath = `${cwd}/package.json`;
  console.log("reading configuration from ", packageJsonPath);
  var json = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  return [json.name, json.version];
};

const getLatestPublishedNpmVersion = async (packageName) => {
  try {
    const result = (
      await axios.get(`https://registry.npmjs.org/${packageName}/latest`)
    ).data;
    console.log("result: ", result);
    return result["version"];
  } catch (e) {
    throw new Error("No configuration found for package: ", packageName);
  }
};

const tryPublishNpmPackage = async (npmToken, cwdArgs) => {
  console.log("updating npm package");
  const currentDir = cwdArgs.join("/");

  const [packageName, localPackageVersion] = getLocalNpmPackageInfo(currentDir);
  console.log("packageName: ", packageName);
  console.log("localPackageVersion: ", localPackageVersion);
  const remotePackageVersion = await getLatestPublishedNpmVersion(packageName);
  console.log("remotePackageVersion: ", remotePackageVersion);

  if (shouldPublishPackage(localPackageVersion, remotePackageVersion)) {
    wrappedExec(
      `echo "//registry.npmjs.org/:_authToken=${npmToken}" > ~/.npmrc`,
      currentDir
    );
    console.log(`cwdArgs: `, cwdArgs);
    wrappedExec(`npm publish`, currentDir);
  } else {
    console.log("no publish needed");
  }
};

// crates package helpers

const getLocalCrateInfo = (cwd) => {
  const cargoPath = `${cwd}/Cargo.toml`;
  let tomlObj = toml.parse(fs.readFileSync(cargoPath, "utf-8"));
  if (!tomlObj.package) throw new Error("No package tag defined in Cargo.toml");

  return [tomlObj.package.name, tomlObj.package.version];
};

const getLatestPublishedCrateVersion = async (crateName) => {
  const result = (
    await axios.get(`https://crates.io/api/v1/crates/${crateName}/versions`)
  ).data;
  console.log("result: ", result);
  const versions = result["versions"];
  if (versions.length === 0) {
    throw new Error(
      "No versions found for package. Is it published yet? ",
      crateName
    );
  }

  // packages are sorted in reverse chronological order
  const latestVersion = versions[0];
  console.log(
    `Found the following latest version info for crate ${crateName}`,
    latestVersion
  );

  if (!versions[0]["num"]) {
    throw new Error("Could find version info for package: ", crateName);
  }

  return versions[0]["num"];
};

const tryPublishCratesPackage = async (cargoToken, cwdArgs) => {
  console.log("updating rust package");
  const currentDir = cwdArgs.join("/");

  const [crateName, localCrateVersion] = getLocalCrateInfo(currentDir);
  console.log("crateName: ", crateName);
  console.log("localCrateVersion: ", localCrateVersion);
  const remoteCrateVersion = await getLatestPublishedCrateVersion(crateName);
  console.log("remoteCrateVersion: ", remoteCrateVersion);

  // only publish if local crate is behind remote crate
  if (shouldPublishPackage(localCrateVersion, remoteCrateVersion)) {
    // wrappedExec(`cargo login ${cargoToken}`, currentDir);
    wrappedExec(
      `cargo publish --token ${cargoToken} -p ${crateName}`,
      currentDir
    );
  } else {
    console.log("no publish needed");
  }
};

/**
 * Iterate through all input packages and version commands and process version updates. NPM
 * changes will use `npm version <semvar>` commands. Crates changes will use the cargo release
 * crate to update a crate version. After each update is committed, it will be appended to the
 * branch that invoked this action.
 *
 * @param {github} obj An @actions/github object
 * @param {context} obj An @actions/context object
 * @param {core} obj An @actions/core object
 * @param {toml} obj An @iarna/toml NPM library to parse TOML files
 * @param {packages} arr List of packages to process in the form <pkg-name>/<sub-dir>
 * @param {versioning} arr List of version commands in the form semvar:pkg:type where type = `program|js`
 * @return void
 */
module.exports = async (
  { github, context, core },
  packages,
  cargoToken,
  npmToken
) => {
  if (packages.length === 0) {
    console.log("No packges to publish. Exiting early.");
    return;
  }

  const base = process.env.GITHUB_ACTION_PATH; // alt: path.join(__dirname);
  const splitBase = base.split("/");
  const parentDirsToHome = 4; // ~/<home>/./.github/actions/<name>
  const cwdArgs = splitBase.slice(0, splitBase.length - parentDirsToHome);

  console.log(`cwdArgs: `, cwdArgs);

  // JSON.parse(packages)
  for (let package of packages) {
    // make sure package doesn't have extra quotes or spacing
    package = package.replace(/\s+|\"|\'/g, "");
    const [name, type] = package.split("/");

    try {
      console.log(`Processing package [${name}] of type [${type}]`);

      cwdArgs.push(...[name, type]);
      console.log("after push args");
      console.log(`cwdArgs: `, cwdArgs);

      if (isCratesPackage(type))
        await tryPublishCratesPackage(cargoToken, cwdArgs, toml);
      else if (isNpmPackage(type))
        await tryPublishNpmPackage(npmToken, cwdArgs);
      else continue;

      // chdir back two levels - back to root, should match original cwd
      cwdArgs.pop();
      cwdArgs.pop();
    } catch (e) {
      console.log(`could not process ${name}/${type} - got error ${e}`);
    }
  }
};
