import globals from "globals";

export default [{
    ignores: ["**/THIRD_PARTY_NOTICES.md", "include/*", "nr-reports-builder-nerdpack"],
}, {
    languageOptions: {
        globals: {
            ...globals.node,
        },

        ecmaVersion: 2018,
        sourceType: "commonjs",
    },

    rules: {
        quotes: ["error", "single"],
        indent: ["error", 2],
        semi: ["error", "never"],
        "comma-dangle": ["error", "always-multiline"],
        "class-methods-use-this": "off",
    },
}];
