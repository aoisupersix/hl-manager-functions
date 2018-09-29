"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
/**
 * プッシュ通知を送信します。
 * @param tokens FCMトークン
 * @param title メッセージタイトル
 * @param body メッセージボディ
 * @param icon 通知のアイコン
 */
function sendNotification(tokens, title, body, icon) {
    const payload = {
        notification: {
            title: title,
            body: body,
            icon: icon,
        }
    };
    return admin.messaging().sendToDevice(tokens, payload);
}
exports.sendNotification = sendNotification;
//# sourceMappingURL=notification.js.map