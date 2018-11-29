"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ジオフェンス領域の識別子名
 * アプリのジオフェンス領域と連動させること。
 * DBでは「.」が使えないので省略する。
 * 命名規則：ジオフェンスの識別子名から、「org.hykwlab.hlregionchecker.」を除去した文字列とする。
 */
exports.Identifiers = [
    'region-campus-1',
    'region-campus-2',
    'region-campus-3',
];
/**
 * 現在侵入しているジオフェンス領域のメッセージ用
 * 適宜変えて下さい。
 */
exports.IdentifierDescriptions = {
    'region-campus-1': '体育寮・グラウンド付近',
    'region-campus-2': 'A~C館・バス停付近',
    'region-campus-3': '工学部棟・学生駐車場付近',
};
//# sourceMappingURL=geofenceIdentifiers.js.map