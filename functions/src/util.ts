const timezoneoffset = -9 //UTC -> JST

/**
 * 現在時刻の文字列を取得して返します。
 * @returns 現在時刻の文字列
 */
export function getFormattedNowDate() {
    const d = new Date(Date.now() - (timezoneoffset * 60 - new Date().getTimezoneOffset()) * 60000);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
}