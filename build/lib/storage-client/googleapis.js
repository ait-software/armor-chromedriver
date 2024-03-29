"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGoogleapiStorageXml = exports.parseNotes = exports.findChildNode = void 0;
const lodash_1 = __importDefault(require("lodash"));
const xpath_1 = __importDefault(require("xpath"));
const armor_support_1 = require("armor-support");
const utils_1 = require("../utils");
const bluebird_1 = __importDefault(require("bluebird"));
const constants_1 = require("../constants");
const xmldom_1 = require("@xmldom/xmldom");
const path_1 = __importDefault(require("path"));
const log = armor_support_1.logger.getLogger('ChromedriverGoogleapisStorageClient');
const MAX_PARALLEL_DOWNLOADS = 5;
/**
 *
 * @param {Node|Attr} parent
 * @param {string?} childName
 * @param {string?} text
 * @returns
 */
function findChildNode(parent, childName = null, text = null) {
    if (!childName && !text) {
        return null;
    }
    if (!parent.hasChildNodes()) {
        return null;
    }
    for (let childNodeIdx = 0; childNodeIdx < parent.childNodes.length; childNodeIdx++) {
        const childNode = /** @type {Element|Attr} */ (parent.childNodes[childNodeIdx]);
        if (childName && !text && childName === childNode.localName) {
            return childNode;
        }
        if (text) {
            const childText = extractNodeText(childNode);
            if (!childText) {
                continue;
            }
            if (childName && childName === childNode.localName && text === childText) {
                return childNode;
            }
            if (!childName && text === childText) {
                return childNode;
            }
        }
    }
    return null;
}
exports.findChildNode = findChildNode;
/**
 *
 * @param {Node?} node
 * @returns
 */
function extractNodeText(node) {
    return !node || !node.firstChild || !armor_support_1.util.hasValue(node.firstChild.nodeValue)
        ? null
        : node.firstChild.nodeValue;
}
/**
 * Gets additional chromedriver details from chromedriver
 * release notes
 *
 * @param {string} content - Release notes of the corresponding chromedriver
 * @returns {import('../types').AdditionalDriverDetails}
 */
function parseNotes(content) {
    const result = {};
    const versionMatch = /^\s*[-]+ChromeDriver[\D]+([\d.]+)/im.exec(content);
    if (versionMatch) {
        result.version = versionMatch[1];
    }
    const minBrowserVersionMatch = /^\s*Supports Chrome[\D]+(\d+)/im.exec(content);
    if (minBrowserVersionMatch) {
        result.minBrowserVersion = minBrowserVersionMatch[1];
    }
    return result;
}
exports.parseNotes = parseNotes;
/**
 * Parses chromedriver storage XML and returns
 * the parsed results
 *
 * @param {string} xml - The chromedriver storage XML
 * @param {boolean} shouldParseNotes [true] - If set to `true`
 * then additional drivers information is going to be parsed
 * and assigned to `this.mapping`
 * @returns {Promise<ChromedriverDetailsMapping>}
 */
async function parseGoogleapiStorageXml(xml, shouldParseNotes = true) {
    const doc = new xmldom_1.DOMParser().parseFromString(xml);
    const driverNodes = /** @type {Array<Node|Attr>} */ (xpath_1.default.select(`//*[local-name(.)='Contents']`, doc));
    log.debug(`Parsed ${driverNodes.length} entries from storage XML`);
    if (lodash_1.default.isEmpty(driverNodes)) {
        throw new Error('Cannot retrieve any valid Chromedriver entries from the storage config');
    }
    const promises = [];
    const chunk = [];
    /** @type {ChromedriverDetailsMapping} */
    const mapping = {};
    for (const driverNode of driverNodes) {
        const k = extractNodeText(findChildNode(driverNode, 'Key'));
        if (!lodash_1.default.includes(k, '/chromedriver_')) {
            continue;
        }
        const key = String(k);
        const etag = extractNodeText(findChildNode(driverNode, 'ETag'));
        if (!etag) {
            log.debug(`The entry '${key}' does not contain the checksum. Skipping it`);
            continue;
        }
        const filename = path_1.default.basename(key);
        const osNameMatch = /_([a-z]+)/i.exec(filename);
        if (!osNameMatch) {
            log.debug(`The entry '${key}' does not contain valid OS name. Skipping it`);
            continue;
        }
        /** @type {ChromedriverDetails} */
        const cdInfo = {
            url: `${constants_1.GOOGLEAPIS_CDN}/${key}`,
            etag: lodash_1.default.trim(etag, '"'),
            version: /** @type {string} */ (lodash_1.default.first(key.split('/'))),
            minBrowserVersion: null,
            os: {
                name: osNameMatch[1],
                arch: filename.includes(constants_1.ARCH.X64) ? constants_1.ARCH.X64 : constants_1.ARCH.X86,
                cpu: constants_1.APPLE_ARM_SUFFIXES.some((suffix) => filename.includes(suffix)) ? constants_1.CPU.ARM : constants_1.CPU.INTEL,
            }
        };
        mapping[key] = cdInfo;
        const notesPath = `${cdInfo.version}/notes.txt`;
        const isNotesPresent = !!driverNodes.reduce((acc, node) => Boolean(acc || findChildNode(node, 'Key', notesPath)), false);
        if (!isNotesPresent) {
            cdInfo.minBrowserVersion = null;
            if (shouldParseNotes) {
                log.info(`The entry '${key}' does not contain any notes. Skipping it`);
            }
            continue;
        }
        else if (!shouldParseNotes) {
            continue;
        }
        const promise = bluebird_1.default.resolve(retrieveAdditionalDriverInfo(key, `${constants_1.GOOGLEAPIS_CDN}/${notesPath}`, cdInfo));
        promises.push(promise);
        chunk.push(promise);
        if (chunk.length >= MAX_PARALLEL_DOWNLOADS) {
            await bluebird_1.default.any(chunk);
        }
        lodash_1.default.remove(chunk, (p) => p.isFulfilled());
    }
    await bluebird_1.default.all(promises);
    log.info(`The total count of entries in the mapping: ${lodash_1.default.size(mapping)}`);
    return mapping;
}
exports.parseGoogleapiStorageXml = parseGoogleapiStorageXml;
/**
 * Downloads chromedriver release notes and puts them
 * into the dictionary argument
 *
 * The method call mutates by merging `AdditionalDriverDetails`
 * @param {string} driverKey - Driver version plus archive name
 * @param {string} notesUrl - The URL of chromedriver notes
 * @param {ChromedriverDetails} infoDict - The dictionary containing driver info.
 * @param {number} timeout
 * @throws {Error} if the release notes cannot be downloaded
 */
async function retrieveAdditionalDriverInfo(driverKey, notesUrl, infoDict, timeout = constants_1.STORAGE_REQ_TIMEOUT_MS) {
    const notes = await (0, utils_1.retrieveData)(notesUrl, {
        'user-agent': 'armor',
        accept: '*/*',
    }, { timeout });
    const { minBrowserVersion } = parseNotes(notes);
    if (!minBrowserVersion) {
        log.debug(`The driver '${driverKey}' does not contain valid release notes at ${notesUrl}. ` +
            `Skipping it`);
        return;
    }
    infoDict.minBrowserVersion = minBrowserVersion;
}
/**
 * @typedef {import('../types').SyncOptions} SyncOptions
 * @typedef {import('../types').OSInfo} OSInfo
 * @typedef {import('../types').ChromedriverDetails} ChromedriverDetails
 * @typedef {import('../types').ChromedriverDetailsMapping} ChromedriverDetailsMapping
 */
//# sourceMappingURL=googleapis.js.map