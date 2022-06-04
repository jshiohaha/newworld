const getPackageAndExtension = (path) => {
  const invalidPathDefault = ["", ""];

  const pathParts = path.trim().toLowerCase().split("/");
  if (pathParts.length === 0) return invalidPathDefault;
  const extensionParts = pathParts[pathParts.length - 1].split(".");
  // we expect at least 2 items in the result: ['name', 'ending']
  if (extensionParts.length < 2) return invalidPathDefault;

  // [package, extension]
  return [pathParts[0], extensionParts[1]];
};

fetchAllChangedFiles = async (
  github,
  owner,
  repo,
  pull_number,
  per_page = 100 // max = 100?
) => {
  let page = 0;
  let files = [];

  while (true) {
    const { data } = await github.pulls.listFiles({
      owner,
      repo,
      pull_number,
      direction: "asc",
      per_page,
      page,
    });

    if (data.length === 0) break;
    files = [...files, ...data.map((f) => f.filename)];

    console.log(`fetched page ${page}`);
    page += 1;
  }

  console.log(`Fetched ${files.length} files for PR ${pull_number}`);

  return files;
};

module.exports = async (
  { github, context, core },
  pull_number,
  target_package,
  target_extensions
) => {
  const parsed_target_extensions = JSON.parse(target_extensions);
  console.log(parsed_target_extensions);
  const changedFiles = await fetchAllChangedFiles(
    github,
    context.repo.owner,
    context.repo.repo,
    pull_number
  );

  console.log("changedFiles: ", changedFiles);

  const filteredFiles = changedFiles.filter((f) => {
    const [pkg, extension] = getPackageAndExtension(f);
    return (
      pkg === target_package && parsed_target_extensions.includes(extension)
    );
  });

  console.log(
    `Found ${
      filteredFiles.length
    } that match package ${target_package} and extension ${JSON.stringify(
      parsed_target_extensions
    )}`
  );
  const assertion = filteredFiles.length > 0;
  core.exportVariable("ASSERTION", assertion);
};
