"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * *********************************************
 * 時刻回りのUtility
 * *********************************************
 */
const timezoneoffset = -9; //UTC -> JST
/**
 * JST時間の現在時刻Dateを返します。
 * @returns Date
 */
function getJstDate() {
    return new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);
}
exports.getJstDate = getJstDate;
/**
 * 引数に与えられたDateの時分秒を0で初期化します。
 * @param date Date
 */
function initializeDate(date) {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}
exports.initializeDate = initializeDate;
/**
 * 引数に与えられた数字列を2桁で埋めます。
 * @param original 桁埋めする数字
 */
function format2Digit(original) {
    return ("0" + original).slice(-2);
}
exports.format2Digit = format2Digit;
/**
 * 引数に与えられた数字列を4桁で埋めます。
 * @param original 桁埋めする数字
 */
function format4Digit(original) {
    return ("000" + original).slice(-4);
}
exports.format4Digit = format4Digit;
/**
 * 現在日時の文字列を取得して返します。
 */
function getNowDayString() {
    return getDayString(getJstDate());
}
exports.getNowDayString = getNowDayString;
/**
 * 引数に与えられたDateから日時の文字列を取得して返します。
 * @param date Date
 */
function getDayString(date) {
    return `${format4Digit(date.getFullYear())}/${format2Digit(date.getMonth() + 1)}/${format2Digit(date.getDate())}`;
}
exports.getDayString = getDayString;
/**
 * 現在時刻の文字列を取得して返します。
 */
function getNowDateString() {
    return getDateString(getJstDate());
}
exports.getNowDateString = getNowDateString;
/**
 * 引数に与えられたDateから時刻の文字列を取得して返します。
 * @param date Date
 */
function getDateString(date) {
    return `${format4Digit(date.getFullYear())}/${format2Digit(date.getMonth() + 1)}/${format2Digit(date.getDate())} ${format2Digit(date.getHours())}:${format2Digit(date.getMinutes())}:${format2Digit(date.getSeconds())}`;
}
exports.getDateString = getDateString;
/**
 * 引数に与えられたDateからlogのKey名(YearMonthDate)を取得して返します。
 * @param date Date
 */
function getLogsKeyString(date) {
    return `${format4Digit(date.getFullYear())}${format2Digit(date.getMonth() + 1)}${format2Digit(date.getDate())}`;
}
exports.getLogsKeyString = getLogsKeyString;
/**
 * 引数に与えられた２つのDateの日数差を取得して返します。
 * @param date1 比較対象1
 * @param date2 比較対象2
 */
function getDiff(date1, date2) {
    const msDiff = date2.getTime() - date1.getTime();
    let daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    return ++daysDiff;
}
exports.getDiff = getDiff;
//# sourceMappingURL=dateUtil.js.map