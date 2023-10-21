const Configuration = {
  extends: ["@commitlint/config-conventional"],
  roles: {
    "header-max-length": [0, "always", 120],
  },
};

module.exports = Configuration;
