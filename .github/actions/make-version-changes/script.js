const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// store somewhere else?
const MPL_PROGRAM_CONFIG = {
  "auction-house": {
    has_idl: "true",
    uses_anchor: "true",
  },
  auction: {
    has_idl: "false",
    uses_anchor: "false",
  },
  auctioneer: {
    has_idl: "true",
    uses_anchor: "true",
  },
  core: {
    has_idl: "false",
    uses_anchor: "false",
  },
  "candy-machine": {
    has_idl: "true",
    uses_anchor: "true",
  },
  "fixed-price-sale": {
    has_idl: "true",
    uses_anchor: "true",
  },
  gumdrop: {
    has_idl: "false",
    uses_anchor: "false",
  },
  metaplex: {
    has_idl: "false",
    uses_anchor: "false",
  },
  "nft-packs": {
    has_idl: "false",
    uses_anchor: "false",
  },
  "token-entangler": {
    has_idl: "true",
    uses_anchor: "true",
  },
  // uses shank
  "token-metadata": {
    has_idl: "true",
    uses_anchor: "false",
  },
  // uses shank
  "token-vault": {
    has_idl: "true",
    uses_anchor: "false",
  },
};

const wrappedExec = (cmd, cwd) => {
  let args = {
    stdio: "inherit",
  };

  if (cwd) {
    args["cwd"] = cwd;
  } else {
    args["cwd"] = path.join(__dirname);
  }

  execSync(cmd, args);
};

const packageUsesAnchor = (pkg) => MPL_PROGRAM_CONFIG[pkg]["uses_anchor"];
const packageHasIdl = (pkg) => MPL_PROGRAM_CONFIG[pkg]["has_idl"];

const isPackageType = (actual, target) => actual === target;
const isCratesPackage = (actual) => isPackageType(actual, "program");
const isNpmPackage = (actual) => isPackageType(actual, "js");

// (package, type, semvar)
const parseVersioningCommand = (cmd) => {
  return ["*", "*", cmd];
};

const shouldUpdate = (actual, target) => target === "*" || target === actual;

// const getCratePackageVersion = () => {
//   const package_id_file = "package_id";
//   await exec(`cargo pkgid > ${package_id_file}`);

//   const fileVersionDirty = fs.readFileSync(package_id_file,'utf8');
//   const regexp = /(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$)/g
//   const match = fileVersionDirty.match(regexp);
//   if (!match) throw new Error("Could not match version from ", fileVersionDirty);

//   return match[0];
// }

const updateCratesPackage = (cwdArgs, pkg, semvar) => {
  console.log("updating rust package");
  const currentDir = cwdArgs.join("/");

  console.log("currentDir: ", currentDir);
  wrappedExec(`ls ${currentDir}`);

  // // adds git info automatically, --no-tag
  // wrappedExec(`cargo release --no-publish --no-push --no-confirm --verbose --execute ${semvar}`, currentDir);
  // console.log("status after release: ");
  // wrappedExec(`git status`);

  // // generate IDL
  // if (packageHasIdl(pkg)) {
  //   let idlName = `${pkg.replace("-", "_")}.json`;
  //   if (packageUsesAnchor(pkg)) {
  //     // build via anchor to generate IDL
  //     wrappedExec(`anchor build --skip-lint --idl ../../target/idl`, currentDir);
  //   } else {
  //     // generate IDL via shank
  //     wrappedExec(`shank idl --out-dir ../../target/idl  --crate-root .`, currentDir);
  //     // prepend `mpl_` to IDL name
  //     idlName = `mpl_${idlName}`;
  //   }

  //   // cp IDL to js dir
  //   wrappedExec(`cp ../../target/idl/${idlName} ../js/idl/`, currentDir);

  // await io.cp(`../../target/idl/${idlName}`, "../js/idl/", {
  //   recursive: false,
  //   force: false,
  // });
  // }
};

const updateNpmPackage = (cwdArgs, _pkg, semvar) => {
  console.log("updating js package");

  // adds git info automatically
  wrappedExec(`npm version ${semvar}`, cwdArgs.join("/"));
  console.log("log after upate: ", wrappedExec("git log"));
};

// todo: add comment for expected format
module.exports = async ({ github, context, core }, packages, versioning) => {
  // const base = path.join(__dirname);
  // const cwdArgs = [root];
  // console.log("root: ", root);
  // console.log("cwdArgs: ", cwdArgs);

  console.log("GITHUB_ACTION", process.env.GITHUB_ACTION);
  console.log("GITHUB_ACTION_PATH", process.env.GITHUB_ACTION_PATH);
  console.log("GITHUB_EVENT_PATH", process.env.GITHUB_EVENT_PATH);
  console.log("GITHUB_PATH", process.env.GITHUB_PATH);

  // wrappedExec("git status");
  // wrappedExec("echo 'hello world' > hello");
  // wrappedExec("git status");
  // wrappedExec("pwd", cwdArgs.join("/"));
  console.log(`===========================`);

  // console.log("versioning: ", versioning);

  // if (versioning.length === 0) {
  //   console.log("No versioning updates to make. Exiting early.");
  //   return;
  // }

  // // packages   => [auction-house/program, candy-machine/js]
  // // versioning => ["patch"] // patch:js, minor:rust

  // wrappedExec("git config user.name github-actions[bot]", cwdArgs.join("/"));
  // wrappedExec(
  //   "git config user.email github-actions[bot]@users.noreply.github.com",
  //   cwdArgs.join("/")
  // );

  // // for each versioning, check if applies to package?
  // for (const version of versioning) {
  //   const [targetPkg, targetType, semvar] = parseVersioningCommand(version);
  //   if (semvar === "none") {
  //     console.log(
  //       "No versioning updates to make when semvar === none. Continuing."
  //     );
  //     continue;
  //   }

  //   for (const package of packages) {
  //     if (!shouldUpdate(package, targetPkg)) {
  //       console.log(
  //         `No updates for package ${package} based on version command ${version}`
  //       );
  //       continue;
  //     }

  //     const [name, type] = package.split("/");
  //     if (!fs.existsSync(name)) {
  //       console.log("could not find dir: ", name);
  //       continue;
  //     }

  //     // cd to package
  //     console.log(`cd to package: ${name}`);
  //     cwdArgs.push(name);

  //     if (shouldUpdate(type, targetType)) {
  //       console.log(`add type to cwd: ${type}`);
  //       cwdArgs.push(type);

  //       if (isCratesPackage(type))
  //         updateCratesPackage(cwdArgs, package, semvar);
  //       else if (isNpmPackage(type)) updateNpmPackage(cwdArgs, package, semvar);
  //       else continue;
  //     } else {
  //       console.log(
  //         `no update required for package = ${package} of type = ${type}`
  //       );
  //       continue;
  //     }

  //     // chdir back two levels - back to root, should match original cwd
  //     console.log("remove 2 args to go back 2 dirs");
  //     cwdArgs.pop();
  //     cwdArgs.pop();
  //   }
  // }
};
