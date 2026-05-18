const path = require("path");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";
  return {
      mode: argv.mode || "development",
      devtool: isProduction ? false : "source-map",
      entry: {
        contentScript: "./src/contentScript.ts",
        interceptor: "./src/interceptor.ts",
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
          },
        ],
      },
      resolve: {
        extensions: [".tsx", ".ts", ".js"],
      },
      output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
      },
    };

};
