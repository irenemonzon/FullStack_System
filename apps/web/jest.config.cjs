// Jest runs the web app's tests in jsdom. Babel config lives here rather than
// in a babel.config file so it can't leak into the Vite build.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "current" } }],
          ["@babel/preset-react", { runtime: "automatic" }],
          "@babel/preset-typescript",
        ],
        // Rewrites import.meta.env.* (Vite-only) to process.env.*.
        plugins: ["babel-plugin-transform-vite-meta-env"],
      },
    ],
  },
  moduleNameMapper: {
    "\\.css$": "<rootDir>/src/__tests__/styleStub.ts",
    // packages/shared imports its own .ts files with .js extensions (Node ESM).
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
