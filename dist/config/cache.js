"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cache_1 = __importDefault(require("node-cache"));
const cache = new node_cache_1.default({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false,
    deleteOnExpire: true
});
cache.on("expired", (key, value) => {
    console.log(`Key ${key} expired`);
    console.log(value);
});
exports.default = cache;
