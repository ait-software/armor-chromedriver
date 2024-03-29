"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCapValue = exports.toW3cCapNames = void 0;
const lodash_1 = __importDefault(require("lodash"));
const armor_base_driver_1 = require("armor-base-driver");
const W3C_PREFIX = 'goog:';
/**
 *
 * @param {string} capName
 */
function toW3cCapName(capName) {
    return (lodash_1.default.isString(capName) && !capName.includes(':') && !(0, armor_base_driver_1.isStandardCap)(capName))
        ? `${W3C_PREFIX}${capName}`
        : capName;
}
/**
 *
 * @param {Record<string,any>} allCaps
 * @param {string} rawCapName
 * @param {any} defaultValue
 * @returns
 */
function getCapValue(allCaps = {}, rawCapName, defaultValue) {
    for (const [capName, capValue] of lodash_1.default.toPairs(allCaps)) {
        if (toW3cCapName(capName) === toW3cCapName(rawCapName)) {
            return capValue;
        }
    }
    return defaultValue;
}
exports.getCapValue = getCapValue;
/**
 *
 * @param {any} originalCaps
 * @returns {Record<string,any>}
 */
function toW3cCapNames(originalCaps = {}) {
    return lodash_1.default.reduce(originalCaps, (acc, value, key) => {
        acc[toW3cCapName(key)] = value;
        return acc;
    }, /** @type {Record<string,any>} */ ({}));
}
exports.toW3cCapNames = toW3cCapNames;
//# sourceMappingURL=protocol-helpers.js.map