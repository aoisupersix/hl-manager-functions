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
export function getJstDate(): Date {
    return new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);
}

/**
 * 引数に与えられたDateの時分秒を0で初期化します。
 * @param date Date
 */
export function initializeDate(date: Date): Date {
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}

/**
 * 引数に与えられた数字列を2桁で埋めます。
 * @param original 桁埋めする数字
 */
export function format2Digit(original: number): string {
    return ("0"+original).slice(-2);
}

/**
 * 引数に与えられた数字列を4桁で埋めます。
 * @param original 桁埋めする数字
 */
export function format4Digit(original: number): string {
    return ("000"+original).slice(-4);
}

/**
 * 現在日時の文字列を取得して返します。
 */
export function getNowDayString(): string {
    return getDayString(getJstDate());
}

/**
 * 引数に与えられたDateから日時の文字列を取得して返します。
 * @param date Date
 */
export function getDayString(date: Date): string {
    return `${format4Digit(date.getFullYear())}/${format2Digit(date.getMonth() + 1)}/${format2Digit(date.getDate())}`;
}

/**
 * 現在時刻の文字列を取得して返します。
 */
export function getNowDateString(): string {
    return getDateString(getJstDate());
}

/**
 * 引数に与えられたDateから時刻の文字列を取得して返します。
 * @param date Date
 */
export function getDateString(date: Date): string {
    return `${format4Digit(date.getFullYear())}/${format2Digit(date.getMonth() + 1)}/${format2Digit(date.getDate())} ${format2Digit(date.getHours())}:${format2Digit(date.getMinutes())}:${format2Digit(date.getSeconds())}`;
}

/**
 * 引数に与えられたDateからlogのKey名(YearMonthDate)を取得して返します。
 * @param date Date
 */
export function getLogsKeyString(date: Date): string {
    return `${format4Digit(date.getFullYear())}${format2Digit(date.getMonth() + 1)}${format2Digit(date.getDate())}`
}

/**
 * 引数に与えられた２つのDateの日数差を取得して返します。
 * @param date1 比較対象1
 * @param date2 比較対象2
 */
export function getDiff(date1: Date, date2: Date): number {
    const msDiff = date2.getTime() - date1.getTime();
    let daysDiff = Math.floor(msDiff / ( 1000 * 60 * 60 * 24 ));

    return ++daysDiff;
}