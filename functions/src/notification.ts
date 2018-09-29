import * as admin from 'firebase-admin';

/**
 * プッシュ通知を送信します。
 * @param tokens FCMトークン
 * @param title メッセージタイトル
 * @param body メッセージボディ
 * @param icon 通知のアイコン
 */
export function sendNotification(tokens: string | string[], title: string, body: string, icon: string): Promise<admin.messaging.MessagingDevicesResponse> {
  const payload = {
    notification: {
      title: title,
      body: body,
      icon: icon,
    }
  };

  return admin.messaging().sendToDevice(tokens, payload);
}