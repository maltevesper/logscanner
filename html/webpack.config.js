const path = require("path");
const HtmlBundlerPlugin = require("html-bundler-webpack-plugin");

module.exports = {
    mode: "development", // TODO: how should we switch this between development and production?
    devtool: false, // TODO: what is the correct setting here, to either do no transform or fast builds?
    entry: {
        logscanner: "./src/logscanner.html",
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
                oneOf: [
                    // Import CSS/SCSS source file as a CSSStyleSheet object
                    // {
                    //     test: /\.css/,
                    //     resourceQuery: /plaincss/,
                    //     use: [
                    //         "css-loader",
                    //     ]
                    // },
                    {
                        //resourceQuery: /sheet/, // <= the query, e.g. style.scss?sheet
                        test: /\.module\.css$/,
                        //resourceQuery: /^$/,
                        use: [
                            {
                                loader: "css-loader",
                                options: {
                                    exportType: "css-style-sheet", // <= define this option
                                    //esModule: true,
                                    modules: {
                                    //     auto: true,
                                        localIdentName: "[local]",//[name]__[local]--[hash:base64:5]",
                                    //     //exportLocalsConvention: "camelCase",
                                    },
                                },
                            },
                        ],
                    },
                    // Import CSS/SCSS source file as a CSS string
                    {
                        use: [
                            "css-loader",
                        ],
                    }
                ],
            },
            // {
            //     test: /\.css$/,
            //     use: [
            //         {
            //             loader: "css-loader",
            //             options: {
            //                 exportType: "css-style-sheet",
            //                 modules: {
            //                     auto: true,
            //                     localIdentName: "[name]__[local]--[hash:base64:5]",
            //                     exportLocalsConvention: "camelCase",
            //                 },
            //             },
            //         },
            //     ],
            // },
            {
                test: /\.(png|jpe?g|svg|webp|woff2?)$/i,
                type: "asset/inline",
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
        //filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
};