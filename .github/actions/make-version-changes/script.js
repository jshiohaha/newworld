const fs = require("fs");
const path = require("path");

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

const packageUsesAnchor = (pkg) => MPL_PROGRAM_CONFIG[pkg]["uses_anchor"];
const packageHasIdl = (pkg) => MPL_PROGRAM_CONFIG[pkg]["has_idl"];

const isPackageType = (actual, target) => actual === target;
const isCratesPackage = (type) => isPackageType(actual, "js");
const isNpmPackage = (type) => isPackageType(actual, "program");

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

const updateCratesPackage = async (exec, io, cwdArgs, pkg, semvar) => {
  console.log("updating rust package");
  const currentDir = cwdArgs.join("/");

  // adds git info automatically, --no-tag
  await exec.exec(
    `cargo release --no-publish --no-push --no-confirm --verbose --execute ${semvar}`,
    { cwd: currentDir }
  );
  console.log("status after release: ", await exec.exec(`git status`));

  // generate IDL
  if (packageHasIdl(pkg)) {
    let idlName = `${pkg.replace("-", "_")}.json`;
    if (packageUsesAnchor(pkg)) {
      // build via anchor to generate IDL
      await exec.exec(`anchor build --skip-lint --idl ../../target/idl`, {
        cwd: currentDir,
      });
    } else {
      // generate IDL via shank
      await exec.exec(`shank idl --out-dir ../../target/idl  --crate-root .`, {
        cwd: currentDir,
      });
      // prepend `mpl_` to IDL name
      idlName = `mpl_${idlName}`;
    }

    // cp IDL to js dir
    await exec.exec(`cp ../../target/idl/${idlName} ../js/idl/`, {
      cwd: currentDir,
    });

    // await io.cp(`../../target/idl/${idlName}`, "../js/idl/", {
    //   recursive: false,
    //   force: false,
    // });
  }
};

const updateNpmPackage = async (exec, cwdArgs, _pkg, semvar) => {
  console.log("updating js package");

  // adds git info automatically
  await exec.exec(`npm version ${semvar}`, { cwd: cwdArgs.join("/") });
  console.log("log after upate: ", await exec.exec("git log"));
};

// todo: add comment for expected format
module.exports = async (
  { github, context, core, glob, io, exec },
  packages,
  versioning
) => {
  const base = path.join(__dirname);
  const cwdArgs = [base];

  console.log("base: ", base);
  console.log("cwdArgs: ", cwdArgs);

  await exec.exec("pwd", { cwd: cwdArgs.join("/") });
  console.log(`===========================`);

  console.log("packages: ", packages);
  console.log("versioning: ", versioning);

  if (versioning.length === 0) {
    console.log("No versioning updates to make. Exiting early.");
    return;
  }

  // packages   => [auction-house/program, candy-machine/js]
  // versioning => ["patch"] // patch:js, minor:rust

  await exec.exec("git config user.name github-actions[bot]", {
    cwd: cwdArgs.join("/"),
  });
  await exec.exec(
    "git config user.email github-actions[bot]@users.noreply.github.com",
    { cwd: cwdArgs.join("/") }
  );

  // for each versioning, check if applies to package?
  for (const version of versioning) {
    const [targetPkg, targetType, semvar] = parseVersioningCommand(version);
    if (semvar === "none") {
      console.log(
        "No versioning updates to make when semvar === none. Continuing."
      );
      continue;
    }

    for (const package of packages) {
      if (!shouldUpdate(package, targetPkg)) {
        console.log(
          `No updates for package ${package} based on version command ${version}`
        );
        continue;
      }

      const [name, type] = package.split("/");
      if (!fs.existsSync(name)) {
        console.log("could not find dir: ", name);
        continue;
      }

      // cd to package
      console.log(`cd to package: ${name}`);
      cwdArgs.push(name);

      if (shouldUpdate(type, targetType)) {
        console.log(`add type to cwd: ${type}`);
        cwdArgs.push(type);

        if (isCratesPackage(type))
          await updateCratesPackage(exec, io, cwdArgs, package, semvar);
        else if (isNpmPackage(type))
          await updateNpmPackage(exec, cwdArgs, package, semvar);
        else continue;
      } else {
        console.log(
          `no update required for package = ${package} of type = ${type}`
        );
        continue;
      }

      // chdir back two levels - back to root, should match original cwd
      console.log("remove 2 args to go back 2 dirs");
      cwdArgs.pop();
      cwdArgs.pop();
    }
  }
};
