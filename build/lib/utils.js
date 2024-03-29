'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : {default: mod};
  };
Object.defineProperty(exports, '__esModule', {value: true});
exports.convertToInt =
  exports.generateLogPrefix =
  exports.OS =
  exports.getCpuType =
  exports.getOsInfo =
  exports.retrieveData =
  exports.getMostRecentChromedriver =
  exports.CHROMEDRIVER_CHROME_MAPPING =
  exports.CD_VER =
  exports.CD_BASE_DIR =
  exports.getOsName =
  exports.getChromedriverBinaryPath =
  exports.getChromedriverDir =
  exports.getChromeVersion =
    void 0;
const lodash_1 = __importDefault(require('lodash'));
const armor_support_1 = require('armor-support');
const armor_base_driver_1 = require('armor-base-driver');
const path_1 = __importDefault(require('path'));
const compare_versions_1 = require('compare-versions');
const axios_1 = __importDefault(require('axios'));
const os_1 = __importDefault(require('os'));
const constants_1 = require('./constants');
Object.defineProperty(exports, 'OS', {
  enumerable: true,
  get: function () {
    return constants_1.OS;
  },
});
const CD_EXECUTABLE_PREFIX = 'chromedriver';
const MODULE_NAME = 'armor-chromedriver';
/**
 * Calculates the path to the current module's root folder
 *
 * @returns {string} The full path to module root
 * @throws {Error} If the current module root folder cannot be determined
 */
// eslint-disable-next-line no-unused-vars
const getModuleRoot = lodash_1.default.memoize(function getModuleRoot() {
  const root = armor_support_1.node.getModuleRootSync(MODULE_NAME, __filename);
  if (!root) {
    throw new Error(`Cannot find the root folder of the ${MODULE_NAME} Node.js module`);
  }
  return root;
});
// Chromedriver version: minimum Chrome version
const CHROMEDRIVER_CHROME_MAPPING = require('../config/mapping.json');
exports.CHROMEDRIVER_CHROME_MAPPING = CHROMEDRIVER_CHROME_MAPPING;
// const CD_BASE_DIR = path.join(getModuleRoot(), 'chromedriver');
const CD_BASE_DIR = 'path-to-chromedriver';
exports.CD_BASE_DIR = CD_BASE_DIR;
/**
 *
 * @param {import('./types').ChromedriverVersionMapping} mapping
 * @returns {string}
 */
function getMostRecentChromedriver(mapping = CHROMEDRIVER_CHROME_MAPPING) {
  if (lodash_1.default.isEmpty(mapping)) {
    throw new Error('Unable to get most recent Chromedriver version from empty mapping');
  }
  return /** @type {string} */ (
    lodash_1.default.last(lodash_1.default.keys(mapping).sort(compare_versions_1.compareVersions))
  );
}
exports.getMostRecentChromedriver = getMostRecentChromedriver;
const CD_VER =
  process.env.npm_config_chromedriver_version ||
  process.env.CHROMEDRIVER_VERSION ||
  getMostRecentChromedriver();
exports.CD_VER = CD_VER;
/**
 *
 * @param {import('ait-adb').ADB} adb
 * @param {string} bundleId
 * @returns
 */
async function getChromeVersion(adb, bundleId) {
  const {versionName} = await adb.getPackageInfo(bundleId);
  return versionName;
}
exports.getChromeVersion = getChromeVersion;
function getChromedriverDir(osName = getOsName()) {
  return path_1.default.resolve(CD_BASE_DIR, osName);
}
exports.getChromedriverDir = getChromedriverDir;
/**
 *
 * @param {string} osName
 * @returns {Promise<string>}
 */
async function getChromedriverBinaryPath(osName = getOsName()) {
  const rootDir = getChromedriverDir(osName);
  const pathSuffix = osName === constants_1.OS.WINDOWS ? '.exe' : '';
  const paths = await armor_support_1.fs.glob(`${CD_EXECUTABLE_PREFIX}*${pathSuffix}`, {
    cwd: rootDir,
    absolute: true,
    nocase: true,
    nodir: true,
  });
  return lodash_1.default.isEmpty(paths)
    ? path_1.default.resolve(rootDir, `${CD_EXECUTABLE_PREFIX}${pathSuffix}`)
    : /** @type {string} */ (lodash_1.default.first(paths));
}
exports.getChromedriverBinaryPath = getChromedriverBinaryPath;
/**
 *
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig['headers']} headers
 * @param {Pick<import('axios').AxiosRequestConfig, 'timeout'|'responseType'>} opts
 * @returns
 */
async function retrieveData(url, headers, opts = {}) {
  const {timeout = 5000, responseType = 'text'} = opts;
  return (
    await (0, axios_1.default)({
      url,
      headers,
      timeout,
      responseType,
    })
  ).data;
}
exports.retrieveData = retrieveData;
/**
 * @returns {keyof OS}
 */
const getOsName = lodash_1.default.memoize(function getOsName() {
  if (armor_support_1.system.isWindows()) {
    return constants_1.OS.WINDOWS;
  }
  if (armor_support_1.system.isMac()) {
    return constants_1.OS.MAC;
  }
  return constants_1.OS.LINUX;
});
exports.getOsName = getOsName;
const getCpuType = lodash_1.default.memoize(
  /**
   * @returns {string}
   */
  function getCpuType() {
    return lodash_1.default.includes(
      lodash_1.default.toLower(os_1.default.cpus()[0].model),
      'apple',
    )
      ? constants_1.CPU.ARM
      : constants_1.CPU.INTEL;
  },
);
exports.getCpuType = getCpuType;
const getOsInfo = lodash_1.default.memoize(
  /**
   * @returns {Promise<import('./types').OSInfo>}
   */
  async function getOsInfo() {
    return {
      name: getOsName(),
      arch: String(await armor_support_1.system.arch()),
      cpu: getCpuType(),
    };
  },
);
exports.getOsInfo = getOsInfo;
// @ts-expect-error
// error TS2345: Argument of type '{}' is not assignable to parameter of type 'DriverOpts<Readonly<Record<string, Constraint>>>'
// Type '{}' is missing the following properties from type 'ServerArgs': address, allowCors, allowInsecure, basePath, and 26 more.
const getBaseDriverInstance = lodash_1.default.memoize(
  () => new armor_base_driver_1.BaseDriver({}, false),
);
/**
 * Generates log prefix string
 *
 * @param {any} obj log owner instance
 * @param {string?} sessionId Optional session identifier
 * @returns {string}
 */
function generateLogPrefix(obj, sessionId = null) {
  return getBaseDriverInstance().helpers.generateDriverLogPrefix(
    obj,
    sessionId ? sessionId : undefined,
  );
}
exports.generateLogPrefix = generateLogPrefix;
/**
 * Converts the given object to an integer number if possible
 *
 * @param {any} value to be converted
 * @returns {number | null}
 */
function convertToInt(value) {
  switch (typeof value) {
    case 'number':
      return Number.isNaN(value) ? null : value;
    case 'string': {
      const parsedAsInt = parseInt(value, 10);
      return Number.isNaN(parsedAsInt) ? null : parsedAsInt;
    }
    default:
      return null;
  }
}
exports.convertToInt = convertToInt;
//# sourceMappingURL=utils.js.map
