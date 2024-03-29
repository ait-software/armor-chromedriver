"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromedriverStorageClient = void 0;
const utils_1 = require("../utils");
const lodash_1 = __importDefault(require("lodash"));
const bluebird_1 = __importDefault(require("bluebird"));
const path_1 = __importDefault(require("path"));
const armor_support_1 = require("armor-support");
const constants_1 = require("../constants");
const googleapis_1 = require("./googleapis");
const chromelabs_1 = require("./chromelabs");
const compare_versions_1 = require("compare-versions");
const semver_1 = __importDefault(require("semver"));
const MAX_PARALLEL_DOWNLOADS = 5;
const log = armor_support_1.logger.getLogger('ChromedriverStorageClient');
/**
 *
 * @param {string} src
 * @param {string} checksum
 * @returns {Promise<boolean>}
 */
async function isCrcOk(src, checksum) {
    const md5 = await armor_support_1.fs.hash(src, 'md5');
    return lodash_1.default.toLower(md5) === lodash_1.default.toLower(checksum);
}
class ChromedriverStorageClient {
    /**
     *
     * @param {import('../types').ChromedriverStorageClientOpts} args
     */
    constructor(args = {}) {
        const { chromedriverDir = (0, utils_1.getChromedriverDir)(), timeout = constants_1.STORAGE_REQ_TIMEOUT_MS } = args;
        this.chromedriverDir = chromedriverDir;
        this.timeout = timeout;
        /** @type {ChromedriverDetailsMapping} */
        this.mapping = {};
    }
    /**
     * Retrieves chromedriver mapping from the storage
     *
     * @param {boolean} shouldParseNotes [true] - if set to `true`
     * then additional chromedrivers info is going to be retrieved and
     * parsed from release notes
     * @returns {Promise<ChromedriverDetailsMapping>}
     */
    async retrieveMapping(shouldParseNotes = true) {
        const [xmlStr, jsonStr] = await bluebird_1.default.all([
            [constants_1.GOOGLEAPIS_CDN, 'application/xml'],
            [`${constants_1.CHROMELABS_URL}/chrome-for-testing/known-good-versions-with-downloads.json`, 'application/json'],
        ]
            .map(([url, contentType]) => url
            ? (0, utils_1.retrieveData)(url, {
                'user-agent': constants_1.USER_AGENT,
                accept: `${contentType}, */*`,
            }, { timeout: this.timeout })
            : bluebird_1.default.resolve()));
        this.mapping = xmlStr ? await (0, googleapis_1.parseGoogleapiStorageXml)(xmlStr, shouldParseNotes) : {};
        Object.assign(this.mapping, (0, chromelabs_1.parseKnownGoodVersionsWithDownloadsJson)(jsonStr));
        return this.mapping;
    }
    /**
     * Extracts downloaded chromedriver archive
     * into the given destination
     *
     * @param {string} src - The source archive path
     * @param {string} dst - The destination chromedriver path
     */
    async unzipDriver(src, dst) {
        const tmpRoot = await armor_support_1.tempDir.openDir();
        try {
            await armor_support_1.zip.extractAllTo(src, tmpRoot);
            const chromedriverPath = await armor_support_1.fs.walkDir(tmpRoot, true, (itemPath, isDirectory) => !isDirectory && lodash_1.default.toLower(path_1.default.parse(itemPath).name) === 'chromedriver');
            if (!chromedriverPath) {
                throw new Error('The archive was unzipped properly, but we could not find any chromedriver executable');
            }
            log.debug(`Moving the extracted '${path_1.default.basename(chromedriverPath)}' to '${dst}'`);
            await armor_support_1.fs.mv(chromedriverPath, dst, {
                mkdirp: true,
            });
        }
        finally {
            await armor_support_1.fs.rimraf(tmpRoot);
        }
    }
    /**
     * Filters `this.mapping` to only select matching
     * chromedriver entries by operating system information
     * and/or additional synchronization options (if provided)
     *
     * @param {OSInfo} osInfo
     * @param {SyncOptions} opts
     * @returns {Array<String>} The list of filtered chromedriver
     * entry names (version/archive name)
     */
    selectMatchingDrivers(osInfo, opts = {}) {
        const { minBrowserVersion, versions = [] } = opts;
        let driversToSync = lodash_1.default.keys(this.mapping);
        if (!lodash_1.default.isEmpty(versions)) {
            // Handle only selected versions if requested
            log.debug(`Selecting chromedrivers whose versions match to ${versions}`);
            driversToSync = driversToSync.filter((cdName) => versions.includes(`${this.mapping[cdName].version}`));
            log.debug(`Got ${armor_support_1.util.pluralize('item', driversToSync.length, true)}`);
            if (lodash_1.default.isEmpty(driversToSync)) {
                return [];
            }
        }
        const minBrowserVersionInt = (0, utils_1.convertToInt)(minBrowserVersion);
        if (minBrowserVersionInt !== null) {
            // Only select drivers that support the current browser whose major version number equals to `minBrowserVersion`
            log.debug(`Selecting chromedrivers whose minimum supported browser version matches to ${minBrowserVersionInt}`);
            let closestMatchedVersionNumber = 0;
            // Select the newest available and compatible chromedriver
            for (const cdName of driversToSync) {
                const currentMinBrowserVersion = parseInt(String(this.mapping[cdName].minBrowserVersion), 10);
                if (!Number.isNaN(currentMinBrowserVersion) &&
                    currentMinBrowserVersion <= minBrowserVersionInt &&
                    closestMatchedVersionNumber < currentMinBrowserVersion) {
                    closestMatchedVersionNumber = currentMinBrowserVersion;
                }
            }
            driversToSync = driversToSync.filter((cdName) => `${this.mapping[cdName].minBrowserVersion}` ===
                `${closestMatchedVersionNumber > 0 ? closestMatchedVersionNumber : minBrowserVersionInt}`);
            log.debug(`Got ${armor_support_1.util.pluralize('item', driversToSync.length, true)}`);
            if (lodash_1.default.isEmpty(driversToSync)) {
                return [];
            }
            log.debug(`Will select candidate ${armor_support_1.util.pluralize('driver', driversToSync.length)} ` +
                `versioned as '${lodash_1.default.uniq(driversToSync.map((cdName) => this.mapping[cdName].version))}'`);
        }
        if (!lodash_1.default.isEmpty(osInfo)) {
            // Filter out drivers for unsupported system architectures
            const { name, arch, cpu = (0, utils_1.getCpuType)() } = osInfo;
            log.debug(`Selecting chromedrivers whose platform matches to ${name}:${cpu}${arch}`);
            let result = driversToSync.filter((cdName) => this.doesMatchForOsInfo(cdName, osInfo));
            if (lodash_1.default.isEmpty(result) && arch === constants_1.ARCH.X64 && cpu === constants_1.CPU.INTEL) {
                // Fallback to X86 if X64 architecture is not available for this driver
                result = driversToSync.filter((cdName) => this.doesMatchForOsInfo(cdName, {
                    name, arch: constants_1.ARCH.X86, cpu
                }));
            }
            if (lodash_1.default.isEmpty(result) && name === constants_1.OS.MAC && cpu === constants_1.CPU.ARM) {
                // Fallback to Intel/Rosetta if ARM architecture is not available for this driver
                result = driversToSync.filter((cdName) => this.doesMatchForOsInfo(cdName, {
                    name, arch, cpu: constants_1.CPU.INTEL
                }));
            }
            driversToSync = result;
            log.debug(`Got ${armor_support_1.util.pluralize('item', driversToSync.length, true)}`);
        }
        if (!lodash_1.default.isEmpty(driversToSync)) {
            log.debug('Excluding older patches if present');
            /** @type {{[key: string]: string[]}} */
            const patchesMap = {};
            // Older chromedrivers must not be excluded as they follow a different
            // versioning pattern
            const versionWithPatchPattern = /\d+\.\d+\.\d+\.\d+/;
            const selectedVersions = new Set();
            for (const cdName of driversToSync) {
                const cdVersion = this.mapping[cdName].version;
                if (!versionWithPatchPattern.test(cdVersion)) {
                    selectedVersions.add(cdVersion);
                    continue;
                }
                const verObj = semver_1.default.parse(cdVersion, { loose: true });
                if (!verObj) {
                    continue;
                }
                if (!lodash_1.default.isArray(patchesMap[verObj.major])) {
                    patchesMap[verObj.major] = [];
                }
                patchesMap[verObj.major].push(cdVersion);
            }
            for (const majorVersion of lodash_1.default.keys(patchesMap)) {
                if (patchesMap[majorVersion].length <= 1) {
                    continue;
                }
                patchesMap[majorVersion].sort((/** @type {string} */ a, /** @type {string}} */ b) => (0, compare_versions_1.compareVersions)(b, a));
            }
            if (!lodash_1.default.isEmpty(patchesMap)) {
                log.debug('Versions mapping: ' + JSON.stringify(patchesMap, null, 2));
                for (const sortedVersions of lodash_1.default.values(patchesMap)) {
                    selectedVersions.add(sortedVersions[0]);
                }
                driversToSync = driversToSync.filter((cdName) => selectedVersions.has(this.mapping[cdName].version));
            }
        }
        return driversToSync;
    }
    /**
     * Checks whether the given chromedriver matches the operating system to run on
     *
     * @param {string} cdName
     * @param {OSInfo} osInfo
     * @returns {boolean}
     */
    doesMatchForOsInfo(cdName, { name, arch, cpu }) {
        const cdInfo = this.mapping[cdName];
        if (!cdInfo) {
            return false;
        }
        if (cdInfo.os.name !== name || cdInfo.os.arch !== arch) {
            return false;
        }
        if (cpu && cdInfo.os.cpu && this.mapping[cdName].os.cpu !== cpu) {
            return false;
        }
        return true;
    }
    /**
     * Retrieves the given chromedriver from the storage
     * and unpacks it into `this.chromedriverDir` folder
     *
     * @param {number} index - The unique driver index
     * @param {string} driverKey - The driver key in `this.mapping`
     * @param {string} archivesRoot - The temporary folder path to extract
     * downloaded archives to
     * @param {boolean} isStrict [true] - Whether to throw an error (`true`)
     * or return a boolean result if the driver retrieval process fails
     * @throws {Error} if there was a failure while retrieving the driver
     * and `isStrict` is set to `true`
     * @returns {Promise<boolean>} if `true` then the chromedriver is successfully
     * downloaded and extracted.
     */
    async retrieveDriver(index, driverKey, archivesRoot, isStrict = false) {
        const { url, etag, version } = this.mapping[driverKey];
        const archivePath = path_1.default.resolve(archivesRoot, `${index}.zip`);
        log.debug(`Retrieving '${url}' to '${archivePath}'`);
        try {
            await armor_support_1.net.downloadFile(url, archivePath, {
                isMetered: false,
                timeout: constants_1.STORAGE_REQ_TIMEOUT_MS,
            });
        }
        catch (e) {
            const err = /** @type {Error} */ (e);
            const msg = `Cannot download chromedriver archive. Original error: ${err.message}`;
            if (isStrict) {
                throw new Error(msg);
            }
            log.error(msg);
            return false;
        }
        if (etag && !(await isCrcOk(archivePath, etag))) {
            const msg = `The checksum for the downloaded chromedriver '${driverKey}' did not match`;
            if (isStrict) {
                throw new Error(msg);
            }
            log.error(msg);
            return false;
        }
        const fileName = `${path_1.default.parse(url).name}_v${version}` + (armor_support_1.system.isWindows() ? '.exe' : '');
        const targetPath = path_1.default.resolve(this.chromedriverDir, fileName);
        try {
            await this.unzipDriver(archivePath, targetPath);
            await armor_support_1.fs.chmod(targetPath, 0o755);
            log.debug(`Permissions of the file '${targetPath}' have been changed to 755`);
        }
        catch (e) {
            const err = /** @type {Error} */ (e);
            if (isStrict) {
                throw err;
            }
            log.error(err.message);
            return false;
        }
        return true;
    }
    /**
     * Retrieves chromedrivers from the remote storage
     * to the local file system
     *
     * @param {SyncOptions} opts
     * @throws {Error} if there was a problem while retrieving
     * the drivers
     * @returns {Promise<string[]>} The list of successfully synchronized driver keys
     */
    async syncDrivers(opts = {}) {
        if (lodash_1.default.isEmpty(this.mapping)) {
            await this.retrieveMapping(!!opts.minBrowserVersion);
        }
        if (lodash_1.default.isEmpty(this.mapping)) {
            throw new Error('Cannot retrieve chromedrivers mapping from Google storage');
        }
        const driversToSync = this.selectMatchingDrivers(opts.osInfo ?? (await (0, utils_1.getOsInfo)()), opts);
        if (lodash_1.default.isEmpty(driversToSync)) {
            log.debug(`There are no drivers to sync. Exiting`);
            return [];
        }
        log.debug(`Got ${armor_support_1.util.pluralize('driver', driversToSync.length, true)} to sync: ` +
            JSON.stringify(driversToSync, null, 2));
        /**
         * @type {string[]}
         */
        const synchronizedDrivers = [];
        const promises = [];
        const chunk = [];
        const archivesRoot = await armor_support_1.tempDir.openDir();
        try {
            for (const [idx, driverKey] of driversToSync.entries()) {
                const promise = bluebird_1.default.resolve((async () => {
                    if (await this.retrieveDriver(idx, driverKey, archivesRoot, !lodash_1.default.isEmpty(opts))) {
                        synchronizedDrivers.push(driverKey);
                    }
                })());
                promises.push(promise);
                chunk.push(promise);
                if (chunk.length >= MAX_PARALLEL_DOWNLOADS) {
                    await bluebird_1.default.any(chunk);
                }
                lodash_1.default.remove(chunk, (p) => p.isFulfilled());
            }
            await bluebird_1.default.all(promises);
        }
        finally {
            await armor_support_1.fs.rimraf(archivesRoot);
        }
        if (!lodash_1.default.isEmpty(synchronizedDrivers)) {
            log.info(`Successfully synchronized ` +
                `${armor_support_1.util.pluralize('chromedriver', synchronizedDrivers.length, true)}`);
        }
        else {
            log.info(`No chromedrivers were synchronized`);
        }
        return synchronizedDrivers;
    }
}
exports.ChromedriverStorageClient = ChromedriverStorageClient;
exports.default = ChromedriverStorageClient;
/**
 * @typedef {import('../types').SyncOptions} SyncOptions
 * @typedef {import('../types').OSInfo} OSInfo
 * @typedef {import('../types').ChromedriverDetails} ChromedriverDetails
 * @typedef {import('../types').ChromedriverDetailsMapping} ChromedriverDetailsMapping
 */
//# sourceMappingURL=storage-client.js.map