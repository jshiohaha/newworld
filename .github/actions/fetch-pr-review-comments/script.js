// https://github.com/octokit/octokit.graphql.net/blob/master/Octokit.GraphQL/Model/CommentAuthorAssociation.cs
const VALID_AUTHOR_ASSOCIATIONS = ["owner", "member", "contributor"];
const VALID_REVIEW_STATES = ["approved", "comment"];
const VERSIONING_REGEX = /^(patch|minor|major)$/g;

const findFirstReviewWithVersion = (reviews) => {
  let version = "none";
  for (const review of reviews) {
    if (!isValidReview(review)) continue;
    const reviewVersion = getVersionFromReview(review);
    if (reviewVersion.length > 0) {
      // update version and break, we found the most recent version comment
      version = reviewVersion;
      break;
    }
  }

  return version;
};

const getVersionFromReview = (review) => {
  const body = review.body
    .toLowerCase()
    .split("\n")
    .filter((t) => t.length > 0);

  console.log("body: ", body);

  const versionCommentsInBody = body.filter((c) =>
    VERSIONING_REGEX.test(c.trim())
  );

  // return empty list or last matching version comment
  return versionCommentsInBody.length === 0
    ? []
    : versionCommentsInBody[versionCommentsInBody.length - 1];
};

const isValidReview = (review) => {
  const author_association = review.author_association.toLowerCase();
  const state = review.state.toLowerCase();

  console.log("check VALID_AUTHOR_ASSOCIATIONS");
  if (!VALID_AUTHOR_ASSOCIATIONS.includes(author_association)) return false;
  console.log("check VALID_REVIEW_STATES");
  if (!VALID_REVIEW_STATES.includes(state)) return false;

  console.log(`review is valid: ${review}`);
  return true;
};

fetchPullRequestReviewsDesc = async (
  github,
  owner,
  repo,
  pull_number,
  per_page = 100
) => {
  let page = 0;
  let reviews = []; // string[]

  while (true) {
    const { data } = await github.rest.pulls.listReviews({
      owner,
      repo,
      pull_number,
      direction: "desc",
      per_page,
      page,
    });

    if (data.length === 0) break;
    reviews = [
      ...reviews,
      ...data.map((r) => {
        return {
          author_association: r.author_association,
          state: r.state,
          body: r.body,
        };
      }),
    ];

    console.log(`fetched page ${page}`);
    page += 1;
  }

  console.log(`Fetched ${reviews.length} files for PR ${pull_number}`);

  return reviews;
};

module.exports = async ({ github, context, core }, pull_number) => {
  // const { SHA } = process.env;
  console.log("github: ", github);
  console.log("context: ", context);
  console.log("core: ", core);
  console.log("github.rest: ", github.rest);

  const reviews = await fetchPullRequestReviewsDesc(
    github,
    context.repo.owner,
    context.repo.repo,
    pull_number
  );
  const version = findFirstReviewWithVersion(reviews);
  // core.exportVariable("version", version);
  core.setOutput("version", version);
};
