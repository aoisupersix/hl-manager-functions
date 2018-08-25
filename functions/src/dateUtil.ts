/*
 * *********************************************
 * 時刻回りのUtility
 * *********************************************
 */
const timezoneoffset = -9 //UTC -> JST

/**
 * JST時間の現在時刻Dateを返します。
 * @returns Date
 */
export function getJstDate() {
    return new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);
}

/**
 * 引数に与えられた数字列を2桁で埋めます。
 * @param original 桁埋めする数字
 */
export function format2Digit(original: number) {
    return ("0"+original).slice(-2);
}

/**
 * 引数に与えられた数字列を4桁で埋めます。
 * @param original 桁埋めする数字
 */
export function format4Digit(original: number) {
    return ("000"+original).slice(-4);
}

/**
 * 現在日時の文字列を取得して返します。
 */
export function getNowDayString() {
    return getDayString(getJstDate());
}

/**
 * 引数に与えられたDateから日時の文字列を取得して返します。
 * @param date Date
 */
export function getDayString(date: Date) {
    return `${format4Digit(date.getFullYear())}/${format2Digit(date.getMonth() + 1)}/${format2Digit(date.getDate())}`;
}

/**
 * 現在時刻の文字列を取得して返します。
 */
export function getNowDateString() {
    return getDateString(getJstDate());
}

/**
 * 引数に与えられたDateから時刻の文字列を取得して返します。
 * @param date Date
 */
export function getDateString(date: Date) {
    return `${format4Digit(date.getFullYear())}/${format2Digit(date.getMonth() + 1)}/${format2Digit(date.getDate())} ${format2Digit(date.getHours())}:${format2Digit(date.getMinutes())}:${format2Digit(date.getSeconds())}`;
}