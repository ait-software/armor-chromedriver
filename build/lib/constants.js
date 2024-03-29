"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPLE_ARM_SUFFIXES = exports.CPU = exports.ARCH = exports.OS = exports.CHROMELABS_URL = exports.USER_AGENT = exports.GOOGLEAPIS_CDN = exports.STORAGE_REQ_TIMEOUT_MS = void 0;
exports.STORAGE_REQ_TIMEOUT_MS = 15000;
exports.GOOGLEAPIS_CDN = process.env.npm_config_chromedriver_cdnurl ||
    process.env.CHROMEDRIVER_CDNURL ||
    'https://chromedriver.storage.googleapis.com';
exports.USER_AGENT = 'armor';
exports.CHROMELABS_URL = process.env.npm_config_chromelabs_url ||
    process.env.CHROMELABS_URL ||
    'https://googlechromelabs.github.io';
exports.OS = {
    LINUX: 'linux',
    WINDOWS: 'win',
    MAC: 'mac',
};
exports.ARCH = {
    X64: '64',
    X86: '32',
};
exports.CPU = {
    INTEL: 'intel',
    ARM: 'arm',
};
exports.APPLE_ARM_SUFFIXES = ['64_m1', '_arm64'];
//# sourceMappingURL=constants.js.map