/******************************************************
 * This SVGO config optimizes SVGs for inlining in HTML
 * pages while retaining groups, text, & hidden elements
 * IDs following this pattern: "#element_id.className1.className2"
 * get converted to id="element_id" class="className1 className2"
 * Maintains SVG js/css interactivity, animation and accessibility.
 * ****************************************************/

import { findReferences } from 'svgo/lib/svgo/tools.js';
/**
 * @typedef {import('svgo/lib/types').XastNode} XastNode
 * @typedef {import('svgo/lib/types').XastChild} XastChild
 * @typedef {import('svgo/lib/types').XastParent} XastParent
 * @typedef {import('svgo/lib/types').Visitor} Visitor
 */


/** Get a hashed version of the input string truncated to the given length
 * a shorter hash_length will increase the probability of hash collisions
 * @param {string} str - the string to hash
 * @param {number} hash_length - the length of the output hash (must be less than 32)
 * @returns {string} - the hash string truncated to the given length in base 36
 */
function getHash(str, hash_length) {
    // source: https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, hash_length);
}



const HASH_LENGTH = 3;
const hashCollisionMap = new Map();
/** get a unique prefix for each SVG based on the
 *  filename with a short hash (collision safe) */
function getPrefixHash(path) {
    if (!path) return '';
    let hash = getHash(path, HASH_LENGTH);

    // ensure the hash is unique
    while (hashCollisionMap.has(hash) && hashCollisionMap.get(hash) != path) {
        hash = getHash(path, HASH_LENGTH);
    }

    // save the hash to detect collisions
    hashCollisionMap.set(hash, path);
    return hash + "_";
}

/** Removes a given character from the begining and end of a string
 * Works like trim() but for a specific character */
function trimChar(string, charToRemove) {
    while (string.charAt(0) == charToRemove) {
        string = string.substring(1);
    }
    while (string.charAt(string.length - 1) == charToRemove) {
        string = string.substring(0, string.length - 1);
    }
    return string;
}

/** Adobe programs sometimes replace special chars with hex codes
 * Example: ".ddd" in the layer name becomes "_x2E_ddd" in the exported SVG
 * This function replaces those hex codes back to the original character
 */
function replaceAdobeExportSymbolKeycodes(str) {
    return str.replace(/_x([0-9A-Fa-f]{2,3})_/g, (_, hex) => {
        const int = parseInt(hex, 16);
        return String.fromCharCode(int);
    });
}

replaceAdobeExportSymbolKeycodes("_x2E_ ? ") // should return ". ? "



// SVGO Configuration: https://github.com/svg/svgo#configuration
// use module.exports = { ...below stuff... }  for commonjs
export default {

    // multipass can break some SVGs, so we disable it
    multipass: false, // (boolean, false by default)

    // format the output SVG nicely for humans (disable this for the more minified code)
    js2svg: {
        pretty: true, // add newlines and indentation (boolean, false by default)
    },

    // plugins to run on the SVG
    plugins: [

        /**
         * 1. Run a custom plugin that copies the editor layer name (or id) of every element in the svg to a temporary attribute "savedId"
         */
        {
            name: 'saveId',
            fn: () => ({
                element: {
                    enter: (node) => {
                        // save the layer name or id attribute to a temporary attribute "savedId"
                        // (diffrent vector editors use different attributes to store the layer name)
                        node.attributes.savedId = node.attributes["data-name"] ?? node.attributes["serif:id"] ?? node.attributes.id ?? '';
                    }
                }
            })
        },


        /**
         *  2: Run the SVGO default plugins preset with some plugins disabled.
         */
        {
            name: "preset-default", // set of standard built-in plugins
            params: {
                overrides: {
                    "removeDesc": false, // description may be helpful for accessibility
                    "removeTitle": false, // title may be helpful for accessibility
                    "moveElemsAttrsToGroup": false, // moving attributes can break some SVGs
                    "moveGroupAttrsToElems": false, // moving attributes can break some SVGs
                    "collapseGroups": false, // if true: may accidentally merge groups that should be independent gamepad elements
                    "removeViewBox": false, // if true: prevents svgs from scaling responsively - not great for websites! https://github.com/svg/svgo/pull/1461
                    "mergePaths": false, // if true: may accidentally merge paths that should be independent gamepad elements
                    "removeHiddenElems": false, // if true: may accidentally remove elements that are visually hidden but might be turned visible by js, or need to be interactable (like tap targets) or be accessible to screen readers.
                    "removeEmptyText": false, // if true: may accidentally remove text elements that are meant to be filled in using js
                    "convertTransform": false,
                    "removeUnknownsAndDefaults": false, // removeUnknownsAndDefaults will get run in the last step, so don't run it here.
                    "cleanupIds": false, // cleanupIds will get run later, so don't run it here.
                }
            }
        },

        /**
         * 3. Run a series of plugins to further cleanup the SVG and prepare it for inlining
         */
        {
            name: 'cleanupIds', params: {
                remove: true, // remove unused ids and minify used ids
                minify: true, // replace internally refrenced ids with random letters
                // array of id prefixes to preserve, these will not be minified, and will
                // get converted into ids and classes at the end with our custom plugin.
                // preservePrefixes: ['#', '.', '_-', '_.'],
            }
        },
        {
            name: 'prefixIds', params: {
                delim: '',
                prefixIds: true, // prefix ids with a unique filename-based hash
                prefixClasses: true, // prefix classes with a unique filename-based hash
                // Using a unique prefix per SVG prevents id collisions across multiple SVGs on the same webpage
                prefix: (_, { path }) => getPrefixHash(path),
            }
        },
        { name: "removeDimensions" }, // we don't need width/height attributes since we're using viewBox
        { name: "removeXlink" }, // html pages don't need xlink:href attributes, they can be replaced with href


        /**
         * 4. Run a custom plugin that splits the svg id with a special format into an id attribute and classes.
         *    (the id typically comes from the layer name in vector editors)
         */
        {
            name: 'idClassSplitter',
            /** Split the svg id attributes with a special format into an id and classes.
            * Example:
            * ```html
            *     <path id="#thisIsAnId.className1.className2" />
            *    becomes:
            *     <path id="thisIsAnId" class="className1 className2" />
            * ```
            * Based on: https://forum.affinity.serif.com/index.php?/topic/35556-custom-css-classes-and-ids-per-group-and-paths-on-svg/&do=findComment&comment=455620
            */
            fn: () => {

                /**
                 * Maps the minified id to the parsed id
                 * @type {Map<string, XastElement>}
                 */
                const parsedIdByMinId = new Map();

                /**
                 * Maps the minified id to the elements that reference it
                 * @type {Map<string, {element: XastElement, attributeName: string }[]>}
                 */
                const referencesById = new Map();

                return {
                    element: {
                        /** @param node {SVGElement} */
                        enter: (node) => {

                            // save attributes that have references in case we need to update them later
                            for (const [attributeName, value] of Object.entries(node.attributes)) {
                                if (attributeName === 'id' || attributeName === 'savedId') continue;
                                const ids = findReferences(attributeName, value);
                                for (const id of ids) {
                                    let refs = referencesById.get(id) || [];
                                    referencesById.set(id, [...refs, { element: node, attributeName }]);
                                }
                            }

                            // we only care about parsing the savedId saved by the plugin at the beginning of processing
                            if (!node.attributes.savedId) return;

                            // get a copy of the saved node id with leading/trailing whitespace removed
                            let originalId = node.attributes.savedId; // savedId is set by the saveId plugin at the beginning
                            let minifiedId = node.attributes.id; // the element id at this point has been minified by SVGO

                            // Replace special characters in layer names garbled by Adobe exporting tools with the original layer name characters
                            originalId = replaceAdobeExportSymbolKeycodes(originalId);

                            // get a copy of the classes on the node
                            const minifiedClasses = node.attributes.class?.split(" ") || [];

                            // Check if the id has a format that we want to split (some vector editors convert # into _- and . into _.)
                            const hasIdWithFormat = originalId.startsWith("#") || originalId.startsWith(".") || originalId.startsWith("_-") || originalId.startsWith("_.");
                            if (!hasIdWithFormat) return;

                            // Split the id string into id and classes where the first part is the id and the rest are classes
                            let idAndClasses = originalId.split('.');
                            if (idAndClasses.length == 0) {
                                delete node.attributes.id;
                                return; // no id and classes to split
                            };

                            // Split the id and classes removing leading or trailing editor-added characters and whitespace
                            let id = idAndClasses.shift() || '';
                            id = trimChar(trimChar(trimChar(id, "_"), "-"), "#").trim();
                            let classes = idAndClasses.map(c => trimChar(trimChar(c, "_"), "-").trim())
                            classes = classes.concat(minifiedClasses).filter(c => c != "");

                            // Add back the trimmed ID
                            if (id != '') node.attributes.id = id;
                            else delete node.attributes.id;

                            // Add back the classes
                            if (classes.length != 0) node.attributes.class = classes.join(" ");
                            else delete node.attributes.class;

                            // Save that we replaced the minifiedId with the parsed id, so we can also replace references to it in the next step
                            if (minifiedId) parsedIdByMinId.set(minifiedId, id);

                            // remove redundant attributes that were added by vector graphics editors
                            delete node.attributes["data-name"];
                            delete node.attributes["serif:id"];
                            delete node.attributes["savedId"];

                            // make SVGO put the id and class attributes first for easier reading in the output svg
                            node.attributes = { id: node.attributes.id, class: node.attributes.class, ...node.attributes };
                        }
                    },

                    root: {
                        exit: () => {
                            // Update any references to the old minified id with the new parsed id
                            for (const [minId, parsedId] of parsedIdByMinId) {
                                const refs = referencesById.get(minId);
                                if (refs == null) continue;
                                for (const { element, attributeName } of refs) {
                                    if (element?.attributes[attributeName] == null || typeof element.attributes[attributeName] != 'string') continue;
                                    element.attributes[attributeName] = element.attributes[attributeName].replace(minId, parsedId);
                                }
                            }
                        }
                    }
                }
            }
        },

        // 5: finally remove any unknown attributes and default values.
        {
            name: "removeUnknownsAndDefaults",
            params: {
                unknownAttrs: true,
                unknownTags: true,
                defaultAttrs: true,
                uselessOverrides: true,
                keepDataAttrs: true, // keep data-* attributes for javascript
                keepAriaAttrs: true, // keep aria attributes for accessibility
            }
        },

        // enable any other plugins you want here
    ]
}
