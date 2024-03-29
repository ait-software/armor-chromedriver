"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLatestKnownGoodVersionsJson = exports.parseKnownGoodVersionsWithDownloadsJson = void 0;
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const armor_support_1 = require("armor-support");
const semver_1 = __importDefault(require("semver"));
const constants_1 = require("../constants");
const log = armor_support_1.logger.getLogger('ChromedriverChromelabsStorageClient');
/**
 * Parses The output of the corresponding JSON API
 * that retrieves Chromedriver versions. See
 * https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints
 * for more details.
 *
 * @param {string} jsonStr
 * @returns {ChromedriverDetailsMapping}
 */
function parseKnownGoodVersionsWithDownloadsJson(jsonStr) {
    let json;
    try {
        json = JSON.parse(jsonStr);
    }
    catch (e) {
        const err = /** @type {Error} */ (e);
        throw new Error(`Storage JSON cannot be parsed. Original error: ${err.message}`);
    }
    /**
     * Example output:
     * {
     * "timestamp":"2023-07-28T13:09:17.042Z",
     * "versions":[
     *    {
     *       "version":"113.0.5672.0",
     *       "revision":"1121455",
     *       "downloads":{
     *          "chromedriver":[
     *             {
     *                "platform":"linux64",
     *                "url":"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/113.0.5672.0/linux64/chrome-linux64.zip"
     *             },
     *             {
     *                "platform":"mac-arm64",
     *                "url":"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/113.0.5672.0/mac-arm64/chrome-mac-arm64.zip"
     *             },
     *             {
     *                "platform":"mac-x64",
     *                "url":"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/113.0.5672.0/mac-x64/chrome-mac-x64.zip"
     *             },
     *             {
     *                "platform":"win32",
     *                "url":"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/113.0.5672.0/win32/chrome-win32.zip"
     *             },
     *             {
     *                "platform":"win64",
     *                "url":"https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/113.0.5672.0/win64/chrome-win64.zip"
     *             }
     *          ]
     *       }
     *    },
     *    {
     *       "version":"113.0.5672.35",
     *       ...
     */
    /** @type {ChromedriverDetailsMapping} */
    const mapping = {};
    if (!lodash_1.default.isArray(json?.versions)) {
        log.debug(jsonStr);
        throw new Error('The format of the storage JSON is not supported');
    }
    for (const { version, downloads } of json.versions) {
        if (!lodash_1.default.isArray(downloads?.chromedriver)) {
            continue;
        }
        const versionObj = semver_1.default.parse(version, { loose: true });
        if (!versionObj) {
            continue;
        }
        for (const downloadEntry of downloads.chromedriver) {
            if (!downloadEntry?.url || !downloadEntry?.platform) {
                continue;
            }
            const osNameMatch = /^[a-z]+/i.exec(downloadEntry.platform);
            if (!osNameMatch) {
                log.debug(`The entry '${downloadEntry.url}' does not contain valid platform name. Skipping it`);
                continue;
            }
            const key = `${path_1.default.basename(path_1.default.dirname(path_1.default.dirname(downloadEntry.url)))}/` +
                `${path_1.default.basename(downloadEntry.url)}`;
            mapping[key] = {
                url: downloadEntry.url,
                etag: null,
                version,
                minBrowserVersion: `${versionObj.major}`,
                os: {
                    name: osNameMatch[0],
                    arch: downloadEntry.platform.includes(constants_1.ARCH.X64) ? constants_1.ARCH.X64 : constants_1.ARCH.X86,
                    cpu: downloadEntry.platform.includes(constants_1.CPU.ARM) ? constants_1.CPU.ARM : constants_1.CPU.INTEL,
                }
            };
        }
    }
    log.info(`The total count of entries in the mapping: ${lodash_1.default.size(mapping)}`);
    return mapping;
}
exports.parseKnownGoodVersionsWithDownloadsJson = parseKnownGoodVersionsWithDownloadsJson;
/**
 * Parses The output of the corresponding JSON API
 * that retrieves the most recent stable Chromedriver version. See
 * https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints
 * for more details.
 *
 * @param {string} jsonStr
 * @returns {string} The most recent available chromedriver version
 */
function parseLatestKnownGoodVersionsJson(jsonStr) {
    let json;
    try {
        json = JSON.parse(jsonStr);
    }
    catch (e) {
        const err = /** @type {Error} */ (e);
        throw new Error(`Storage JSON cannot be parsed. Original error: ${err.message}`);
    }
    /**
     * Example output:
     * "timestamp":"2023-07-28T13:09:17.036Z",
     * "channels":{
     *    "Stable":{
     *       "channel":"Stable",
     *       "version":"115.0.5790.102",
     *       "revision":"1148114"
     * ...
     */
    if (!json?.channels?.Stable?.version) {
        log.debug(jsonStr);
        throw new Error('The format of the storage JSON is not supported');
    }
    return json.channels.Stable.version;
}
exports.parseLatestKnownGoodVersionsJson = parseLatestKnownGoodVersionsJson;
/**
 * @typedef {import('../types').ChromedriverDetailsMapping} ChromedriverDetailsMapping
 */
//# sourceMappingURL=chromelabs.js.map