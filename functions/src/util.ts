/*
 * *********************************************
 * Utility
 * *********************************************
 */

/**
 * 引数に与えられた変数の内、Undefinedの変数が一つでもあるか？
 * @param arg 何らかの変数
 */
export function ContainsUndefined(... arg: any[]): boolean {
    for(const a of arg) {
        if(a === undefined) {
            return true;
        }
    }

    return false;
}