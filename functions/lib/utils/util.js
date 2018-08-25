"use strict";
/*
 * *********************************************
 * Utility
 * *********************************************
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 引数に与えられた変数の内、Undefinedの変数が一つでもあるか？
 * @param arg 何らかの変数
 */
function ContainsUndefined(...arg) {
    for (const a of arg) {
        if (a === undefined) {
            return true;
        }
    }
    return false;
}
exports.ContainsUndefined = ContainsUndefined;
//# sourceMappingURL=util.js.map