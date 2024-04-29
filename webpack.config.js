const path = require("path");
const HtmlBundlerPlugin = require("html-bundler-webpack-plugin");

module.exports = {
    mode: "development", // TODO: how should we switch this between development and production?
    devtool: false, // TODO: what is the correct setting here, to either do no transform or fast builds?
    entry: {
        index: "./src/logview.html",
    },
    plugins: [
        new HtmlBundlerPlugin({
            css:{inline:true},
            js:{inline:true},
        }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["css-loader"],
            },
        ],
    },
    resolve: {
        extensions: [ ".tsx", ".ts", ".js" ],
        extensionAlias: {
            ".js": [".ts", ".js"],
        },
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
};