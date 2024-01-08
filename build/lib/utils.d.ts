/**
 *
 * @param {import('ait-adb').ADB} adb
 * @param {string} bundleId
 * @returns
 */
export function getChromeVersion(adb: import('ait-adb').ADB, bundleId: string): Promise<string | null | undefined>;
export function getChromedriverDir(osName?: string): string;
/**
 *
 * @param {string} osName
 * @returns {Promise<string>}
 */
export function getChromedriverBinaryPath(osName?: string): Promise<string>;
/**
 * @returns {keyof OS}
 */
export const getOsName: (() => string) & _.MemoizedFunction;
export const CD_BASE_DIR: string;
export const CD_VER: string;
export const CHROMEDRIVER_CHROME_MAPPING: any;
/**
 *
 * @param {import('./types').ChromedriverVersionMapping} mapping
 * @returns {string}
 */
export function getMostRecentChromedriver(mapping?: import('./types').ChromedriverVersionMapping): string;
/**
 *
 * @param {string} url
 * @param {import('axios').AxiosRequestConfig['headers']} headers
 * @param {Pick<import('axios').AxiosRequestConfig, 'timeout'|'responseType'>} opts
 * @returns
 */
export function retrieveData(url: string, headers: import('axios').AxiosRequestConfig['headers'], opts?: Pick<import('axios').AxiosRequestConfig, 'timeout' | 'responseType'>): Promise<any>;
export const getOsInfo: (() => Promise<import('./types').OSInfo>) & _.MemoizedFunction;
export const getCpuType: (() => string) & _.MemoizedFunction;
import { OS } from './constants';
/**
 * Generates log prefix string
 *
 * @param {any} obj log owner instance
 * @param {string?} sessionId Optional session identifier
 * @returns {string}
 */
export function generateLogPrefix(obj: any, sessionId?: string | null): string;
/**
 * Converts the given object to an integer number if possible
 *
 * @param {any} value to be converted
 * @returns {number | null}
 */
export function convertToInt(value: any): number | null;
import _ from 'lodash';
export { OS };
//# sourceMappingURL=utils.d.ts.map