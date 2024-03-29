"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doInstall = exports.install = void 0;
const lodash_1 = __importDefault(require("lodash"));
const armor_support_1 = require("armor-support");
const storage_client_1 = __importDefault(require("./storage-client/storage-client"));
const chromelabs_1 = require("./storage-client/chromelabs");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const LATEST_VERSION = 'LATEST';
/**
 *
 * @param {string} ver
 * @returns {Promise<string>}
 */
async function formatCdVersion(ver) {
    if (lodash_1.default.toUpper(ver) !== LATEST_VERSION) {
        return ver;
    }
    let jsonStr;
    const url = `${constants_1.CHROMELABS_URL}/chrome-for-testing/last-known-good-versions.json`;
    try {
        jsonStr = await (0, utils_1.retrieveData)(url, {
            'user-agent': constants_1.USER_AGENT,
            accept: `application/json, */*`,
        }, { timeout: constants_1.STORAGE_REQ_TIMEOUT_MS });
    }
    catch (e) {
        const err = /** @type {Error} */ (e);
        throw new Error(`Cannot fetch the latest Chromedriver version. ` +
            `Make sure you can access ${url} from your machine or provide a mirror by setting ` +
            `a custom value to CHROMELABS_URL enironment variable. Original error: ${err.message}`);
    }
    return (0, chromelabs_1.parseLatestKnownGoodVersionsJson)(jsonStr);
}
/**
 *
 * @param {string} platformName
 */
async function prepareChromedriverDir(platformName) {
    const chromedriverDir = (0, utils_1.getChromedriverDir)(platformName);
    if (!await armor_support_1.fs.exists(chromedriverDir)) {
        await (0, armor_support_1.mkdirp)(chromedriverDir);
    }
    return chromedriverDir;
}
async function install() {
    const osInfo = await (0, utils_1.getOsInfo)();
    const client = new storage_client_1.default({
        chromedriverDir: await prepareChromedriverDir(osInfo.name),
    });
    await client.syncDrivers({
        osInfo,
        versions: [await formatCdVersion(utils_1.CD_VER)],
    });
}
exports.install = install;
async function doInstall() {
    await install();
}
exports.doInstall = doInstall;
//# sourceMappingURL=install.js.map