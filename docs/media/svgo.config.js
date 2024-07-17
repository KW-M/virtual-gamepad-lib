import idClassSplitterPlugin from "./svgo-IdClassSplitterPlugin.js";

/******************************************************
 * This SVGO config optimizes SVGs for inlining in HTML
 * pages while retaining ids, classes, & groups for
 * js/css interactivity, animation and accessibility.
 * ****************************************************/

// Make parameters for the SVGO cleanupIDs plugin such that it will minify ids uniquely across the all optimized SVGs (prevent id collisions)
const globalPrefix = ""; // prefix to add to all internally refrenced IDs in all SVG files compiled by svgo
let globalPrefixCounter = 0; // global counter for prefixing ids refrenced inside a svg, global so that multiple svg's on a page don't have id collisions
let cleanupIDParams = {
    remove: false, // Do NOT remove unused ids (they may be used in the CSS / JS of the page later)
    minify: true, // Minify ids. This will replace internally refrenced ids with our prefix (a number) followed by random letter(s).
    prefix: "" // must be here, but will get overriden with the Object.defineProperty() below
    // tell the plugin to prefix the ids except these ones:
    // preserve: ['this_id_should_not_be_renamed'], // optional array of ids to preserve (not minify or prefix)
    // preservePrefixes: ['pls_dont_rename_ids_that_start_w_this_'], // optional array of id prefixes to preserve (not minify or prefix)
}
// Make the cleanupIDs plugin use the globalPrefixCounter to prefix ids (uses a getter function to update the prefix number each time it is read (ie: for each svg)
Object.defineProperty(cleanupIDParams, 'prefix', {
    get: function () {
        globalPrefixCounter++;
        return globalPrefix + globalPrefixCounter.toString(36) + "";
    },
})


// SVGO Configuration: https://github.com/svg/svgo#configuration
export default {  //  use module.exports = { ...stuff... }  for commonjs
    multipass: true, // boolean. false by default
    datauri: false, // 'base64' (default), 'enc' or 'unenc' or false (don't format as a data URI)
    js2svg: { // how to format the output SVG
        pretty: true, // boolean, false by default (true will add newlines and indentation)
        indent: 2, // string with spaces or number of spaces. 4 by default
    },
    plugins: [

        // 1: run our custom plugin to split element id attributes into ids and classes.
        idClassSplitterPlugin,

        // 2: run the inbuilt cleanupIDs with our own (slightly hacky) parameters
        {
            name: 'cleanupIDs',
            params: cleanupIDParams,
        },

        // 3: run the inbuilt default plugins preset with some plugins disabled
        {
            // set of built-in plugins enabled by default
            name: "preset-default",
            params: {
                overrides: {
                    "removeViewBox": false, // if true: prevents svgs from scaling responsively - not a good idea! https://github.com/svg/svgo/pull/1461
                    "cleanupIDs": false, // if true: may end up removing id's used in the CSS or JS of your page (but not within the SVG itself)
                    "removeUnknownsAndDefaults": false, // if true: may end up removing id's and classes used in the CSS or JS of your page (but not within the SVG itself)
                    "mergePaths": false, // if true: may accidentally merge paths that should be independent gamepad elements
                    "removeTitle": false, // title may be helpful for accessibility
                    "removeDesc": false, // description may be helpful for accessibility
                    "removeHiddenElems": false, // if true: may accidentally remove elements that are visually hidden but might be turned visible by js, or need to be interactable (like tap targets) or be accessible to screen readers.
                    // "removeEmptyText": false, // if true: may accidentally remove text elements that are meant to be filled in using js
                    // "collapseGroups": false, // if true: may accidentally merge groups that should be independent gamepad elements
                }
            }
        },

        // enable any other plugins you want here
    ]
}
